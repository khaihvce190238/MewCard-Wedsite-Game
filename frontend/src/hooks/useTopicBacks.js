import { useEffect, useState } from 'react';
import { api } from '../services/api';

// Cache theo TopicID để Home và trang Chủ đề không gọi lại API.
const cache = new Map();

/** API công khai chỉ trả MẶT SAU lá bài (không lộ mặt trước để khỏi "spoil" trò chơi). */
const loadBacks = (topicId) => {
  if (!cache.has(topicId)) {
    cache.set(
      topicId,
      api.get(`/topics/${topicId}/cards`)
        .then((r) => (r.data.data.cards || []).slice(0, 3).map((c) => c.BackImageURL).filter(Boolean))
        .catch(() => []),
    );
  }
  return cache.get(topicId);
};

/** Trả về { [TopicID]: string[] } — tối đa 3 ảnh mặt sau của mỗi chủ đề (rỗng nếu chưa tải xong/lỗi). */
export function useTopicBacks(topics) {
  const [backs, setBacks] = useState({});
  const ids = (topics || []).map((t) => t.TopicID).join(',');

  useEffect(() => {
    let alive = true;
    (topics || []).forEach((t) => {
      loadBacks(t.TopicID).then((list) => alive && setBacks((b) => ({ ...b, [t.TopicID]: list })));
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  return backs;
}
