'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/context';
import { useCreatePost } from '@/features/posts/hooks';
import type { PostType } from '@/features/posts/types';
import { cn } from '@/lib/utils';

interface PostComposerDialogProps {
  open: boolean;
  onClose: () => void;
}

const TYPE_OPTIONS: { value: PostType; label: string; description: string }[] = [
  { value: 'text', label: 'Post', description: 'Share a thought or update' },
  { value: 'thread', label: 'Thread', description: 'Multi-part discussion' },
  { value: 'link_share', label: 'Link', description: 'Share an external link' },
  { value: 'announcement', label: 'Announcement', description: 'Admin only' },
];

export function PostComposerDialog({ open, onClose }: PostComposerDialogProps) {
  const { profile } = useAuth();
  const createPost = useCreatePost();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [postType, setPostType] = useState<PostType>('text');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const isAdmin = profile?.role === 'admin';
  const availableTypes = isAdmin ? TYPE_OPTIONS : TYPE_OPTIONS.filter((t) => t.value !== 'announcement');

  function handleAddTag() {
    const tag = tagInput.trim();
    if (tag && tags.length < 5 && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  }

  async function handleSubmit() {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required');
      return;
    }

    try {
      await createPost.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        post_type: postType,
        tags: tags.length > 0 ? tags : undefined,
      });
      toast.success('Post created!');
      setTitle('');
      setBody('');
      setPostType('text');
      setTags([]);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create post';
      toast.error(message);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg mx-4 rounded-2xl bg-card border border-border shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Create Post</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Post type selector */}
          <div className="flex gap-1.5 overflow-x-auto">
            {availableTypes.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPostType(opt.value)}
                className={cn(
                  'text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors',
                  postType === opt.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Title */}
          <input
            type="text"
            placeholder="Post title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-200"
          />

          {/* Body */}
          <textarea
            placeholder={postType === 'thread' ? 'First part of your thread...' : 'What\'s on your mind?'}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            maxLength={10000}
            className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
          />

          {/* Tags */}
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add a tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                maxLength={24}
                className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
              <button
                onClick={handleAddTag}
                disabled={!tagInput.trim() || tags.length >= 5}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-gray-200 disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                    {tag}
                    <button onClick={() => setTags(tags.filter((t) => t !== tag))}>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground">
            {body.length}/10000
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={createPost.isPending || !title.trim() || !body.trim()}
              className="text-xs font-medium px-4 py-1.5 rounded-lg bg-organic-orange text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {createPost.isPending ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PostComposerFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-1.5 rounded-full bg-organic-orange px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-orange-600 transition-colors"
    >
      <Plus className="w-4 h-4" />
      Post
    </button>
  );
}
