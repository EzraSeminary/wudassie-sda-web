# Music streaming setup

The server reads audio directly from ImageKit delivery URLs; it never proxies or buffers audio files.

## Required environment

```env
MONGODB_URI=mongodb+srv://...
IMAGEKIT_PUBLIC_KEY=...
IMAGEKIT_PRIVATE_KEY=...
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_endpoint
MUSIC_IMAGEKIT_ROOT=/SDA Songs/
```

`MUSIC_IMAGEKIT_ROOT` is optional and defaults to `/SDA Songs/`. Use the exact ImageKit folder path, including case. Set `MUSIC_SYNC_INTERVAL_MINUTES` to an integer of at least `15` to enable periodic server-side synchronization; otherwise an admin triggers a sync in Music Management.

The synchronizer uses ImageKit file IDs as stable track IDs and marks missing source files instead of deleting local records. Curator metadata is stored separately under each track or collection's `manual` object, so syncing never overwrites it.

## API

Public: `GET /api/music/status`, `/tracks`, `/tracks/:id`, `/collections`, `/collections/:id`, `/featured`, `/recent`, and `/search`.

Authenticated: `GET|POST|DELETE /api/music/favorites`, `GET|POST|PATCH|DELETE /api/music/playlists`, and `GET|POST /api/music/history`.

Admin: `POST /api/music/admin/sync`, `GET /api/music/admin/tracks`, and `PATCH /api/music/admin/tracks/:id` (plus collection metadata patching).
