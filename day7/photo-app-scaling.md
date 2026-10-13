# SnapShare: Scaling Plan

## 1. Assumptions

| Item | Value |
|---|---|
| Registered users | 10,000,000 |
| Daily active users (DAU) | 10% of registered users |
| Uploads per active user per day | 1 photo |
| Feed page views per active user per day | 50 |
| Average original photo size | 2 MB |
| Thumbnail size | 50 KB (one per photo) |
| Seconds per day | 86,400 |
| Peak factor | 5× the average |
| Units | Decimal (1 TB = 1,000,000 MB) |

Other assumptions: traffic is spread evenly across the day for the average, with peaks at 5×. Photos are never deleted (worst case for storage). Replication and backups are ignored in the base estimate.

**Daily active users**

DAU = 10,000,000 × 10% = **1,000,000 users per day**

## 2. Estimates

### Uploads per second
- Uploads per day = 1,000,000 × 1 = 1,000,000
- Average = 1,000,000 / 86,400 ≈ **11.6 uploads/s**
- Peak = 11.6 × 5 ≈ **58 uploads/s**

### Feed views per second
- Feed views per day = 1,000,000 × 50 = 50,000,000
- Average = 50,000,000 / 86,400 ≈ **579 views/s**
- Peak = 579 × 5 ≈ **2,894 views/s (about 2,900/s)**

### Photo storage per year
- Originals per day = 1,000,000 × 2 MB = 2 TB
- Thumbnails per day = 1,000,000 × 50 KB = 50 GB
- Total per day = 2 TB + 0.05 TB = 2.05 TB
- Originals per year = 2 TB × 365 = **730 TB**
- Thumbnails per year = 50 GB × 365 = **18.25 TB**
- Total per year ≈ **748 TB (about 0.75 PB)**

### Extra: upload bandwidth
- Average = 11.6 × 2 MB ≈ 23 MB/s incoming
- Peak = 58 × 2 MB ≈ 116 MB/s incoming

### Summary table

| Metric | Average | Peak (5×) |
|---|---|---|
| Uploads/s | 11.6 | 58 |
| Feed views/s | 579 | 2,894 |
| Storage/year | 748 TB (730 TB originals + 18.25 TB thumbnails) | n/a |

## 3. Read-heavy or write-heavy?

**SnapShare is read-heavy.** There are 50,000,000 feed views per day against 1,000,000 uploads per day, a read:write ratio of about **50:1**. In reality it is even higher, because each feed page shows several photos, so every view triggers many image fetches.

**What this means for the design:**
- Optimize the read path first: CDN for images, cache for feed data, read replicas for the database.
- Reads can be scaled by copying data (caching and replication), which is cheaper than scaling writes.
- Writes are rare and heavy (2 MB files), so keep them off the critical path: accept the upload quickly and do slow work (thumbnails) asynchronously through a queue.
- A small number of writes (about 58/s at peak) can go to a single primary database.

## 4. Why photos must not be stored inside the database

1. **Size and cost:** 730 TB of originals per year in a database would be extremely expensive. Database storage and memory are costly compared with object storage.
2. **Slow queries and backups:** big binary blobs bloat tables, slow backups, replication and restores, and push useful rows out of memory.
3. **Wasted database capacity:** serving image bytes would use database connections and bandwidth that should serve queries.
4. **No CDN-friendly delivery:** a database cannot serve files over HTTP to a CDN. Object storage can.

**Where they go instead:** in **object storage** (e.g. Amazon S3 or Google Cloud Storage), which is cheap, durable, and practically unlimited. The database stores only the **metadata and the URL/key** (photo_id, user_id, object key, created_at, caption). Images are delivered through the **CDN**.

## 5. Architecture diagram

```
                          +----------------------+
                          |  Users (web/mobile)  |
                          +----------+-----------+
                                     |
              +----------------------+----------------------+
              | (image GETs)                                | (API calls: upload, feed)
              v                                             v
      +---------------+                            +-----------------+
      |      CDN      |                            |  Load Balancer  |
      +-------+-------+                            +--------+--------+
              | cache miss                                  |
              v                                  +----------+----------+
   +----------------------+                      |                     |
   |    Object Storage    |                +-----v-----+         +-----v-----+
   | (originals + thumbs) |<---------------| App Server|   ...   | App Server|
   +----------^-----------+  upload file   +--+--+--+--+         +--+--+--+--+
              |                               |  |  |               |  |  |
              |                               |  |  +-------+-------+  |  |
              |                               |  |          |          |  |
              |                    +----------+  |          |          |  |
              |                    |             |          |          |  |
              |              +-----v-----+  +----v------+   |   +------v--+---+
              |              |   Cache   |  |   Queue   |   |   |  Database   |
              |              |  (Redis)  |  | (thumb    |   |   |  (Primary)  |
              |              +-----------+  |  jobs)    |   |   +------+------+
              |                             +----+------+   |          | replication
              |                                  |          |   +------v------+
              |                             +----v------+   |   |  Read       |
              +-----------------------------|  Worker   |   |   |  Replica    |
                  saves thumbnail           | (thumbnail|   |   +-------------+
                                            |  creator) |---+
                                            +-----------+  updates DB row
                                                           (thumbnail ready)

Writes (uploads):  App Server -> Object Storage, Primary DB, Queue -> Worker -> Object Storage + DB
Reads (feed):      App Server -> Cache -> (miss) Read Replica ; images via CDN -> Object Storage
```

Simplified read path: `User -> CDN (images)` and `User -> Load Balancer -> App Server -> Cache -> Read Replica (on miss)`.

## 6. Components (one sentence each)

| Component | Problem it solves |
|---|---|
| **CDN** | Serves popular photos from servers near the user, cutting latency and taking most image traffic off our servers and storage. |
| **Load balancer** | Spreads incoming requests across many app servers so no single server is overloaded and one failure does not take the app down. |
| **App servers** | Run the business logic (auth, upload handling, feed building) and are stateless, so we can add more of them to handle more traffic. |
| **Cache** | Keeps frequently read data (feeds, photo metadata) in memory so repeated reads avoid slow database queries. |
| **Database (primary)** | Stores the structured, relational data (users, follows, photo metadata) reliably and handles all writes. |
| **Read replica** | Holds a copy of the database that serves read queries, so the heavy read load does not slow down the primary. |
| **Object storage** | Stores the large photo files cheaply, durably and at huge scale, which a database cannot do economically. |
| **Queue** | Holds thumbnail jobs so the upload request can return immediately and slow work is handled in the background, even during spikes. |
| **Worker** | Takes jobs from the queue, creates the 50 KB thumbnail, and saves it, so image processing never blocks users. |

## 7. Upload flow (step by step)

1. The user selects a photo in the app and taps **Upload**.
2. The request goes through the **load balancer** to one of the **app servers**.
3. The app server authenticates the user and validates the file (type, size limit, e.g. max 2 to 10 MB).
4. The app server saves the original 2 MB file to **object storage** and gets back an object key (e.g. `photos/original/<photo_id>.jpg`).
5. The app server writes a metadata row to the **primary database** (photo_id, user_id, object key, caption, created_at, `thumbnail_status = pending`).
6. The app server puts a **thumbnail job** (photo_id + object key) on the **queue**.
7. The app server immediately returns **success** to the user (the user does not wait for the thumbnail).
8. A **worker** picks the job off the queue and downloads the original from object storage.
9. The worker creates the 50 KB thumbnail and saves it to object storage (e.g. `photos/thumb/<photo_id>.jpg`).
10. The worker updates the database row to `thumbnail_status = ready` with the thumbnail key. If it fails, the job is retried and eventually sent to a dead-letter queue.
11. The relevant feed **cache** entries for the uploader's followers are invalidated or updated, so the new photo appears.
12. When followers scroll their feed, thumbnails are fetched through the **CDN**, which pulls from object storage on the first miss and caches it afterwards.

## 8. Trade-offs

1. **Eventual consistency (read replica and cache) vs. freshness.** Replicas lag slightly behind the primary and cached feeds can be stale, so a new photo may take seconds to appear for followers. We accept this because feeds do not need to be perfectly up to date, and it lets us serve about 2,900 reads/s at peak cheaply.
2. **Asynchronous thumbnails (queue) vs. simplicity.** Using a queue and worker makes uploads fast and resilient to spikes, but adds more components, retries, and a short window where the thumbnail is not ready (we can show a placeholder). Doing it inside the upload request would be simpler but slower and would break under load.
3. **CDN caching vs. cost and freshness.** A CDN gives low latency and offloads origin servers, but costs money per GB served and cached copies can be stale if a photo is deleted or replaced (needs purge or versioned URLs).
4. **Cache memory cost vs. database load.** A bigger cache reduces database reads but costs RAM and needs invalidation logic, which is a classic source of bugs.
5. **Fan-out on write vs. fan-out on read (feed building).** Precomputing feeds when a photo is uploaded makes reads very fast but costs more writes and storage for users with many followers. Building the feed at read time is simpler but slower. A hybrid approach is common.
6. **Storing every photo forever vs. cost.** Keeping all originals means about 748 TB per year of growth. Using cheaper storage tiers for old photos or compressing images reduces cost but adds complexity and retrieval delay.

## 9. Conclusion

SnapShare is **read-heavy (about 50:1)**. The plan handles about **58 uploads/s and about 2,900 feed views/s at peak**, with **about 748 TB of new photo data per year**, by serving images via a CDN, caching feeds, offloading reads to replicas, storing files in object storage, and processing thumbnails asynchronously with a queue and workers.