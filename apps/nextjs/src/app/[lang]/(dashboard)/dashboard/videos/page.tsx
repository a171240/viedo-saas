"use client";

import { useState, useEffect } from "react";
import { VideoCard } from "~/components/video-generator/video-card";
import { Button } from "@videofly/ui/button";
import { Skeleton } from "@videofly/ui/skeleton";

interface Video {
  uuid: string;
  prompt: string;
  model: string;
  status: string;
  video_url?: string | null;
  thumbnail_url?: string | null;
  created_at: string;
  credits_used: number;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  const loadVideos = async (cursor?: string) => {
    const params = new URLSearchParams({ limit: "20" });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`/api/v1/video/list?${params}`);
    const data = await res.json();

    if (data.success) {
      if (cursor) {
        setVideos((prev) => [...prev, ...data.data.videos]);
      } else {
        setVideos(data.data.videos);
      }
      setNextCursor(data.data.nextCursor);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const handleDelete = async (uuid: string) => {
    const res = await fetch(`/api/v1/video/${uuid}`, { method: "DELETE" });
    if (res.ok) {
      setVideos((prev) => prev.filter((v) => v.uuid !== uuid));
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Videos</h1>
        <Button asChild>
          <a href="/demo">Create New</a>
        </Button>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No videos yet</p>
          <Button className="mt-4" asChild>
            <a href="/demo">Create your first video</a>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <VideoCard
                key={video.uuid}
                video={video}
                onDelete={() => handleDelete(video.uuid)}
              />
            ))}
          </div>

          {nextCursor && (
            <div className="text-center">
              <Button variant="outline" onClick={() => loadVideos(nextCursor)}>
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
