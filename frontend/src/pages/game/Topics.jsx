import { useFetch } from '../../hooks/useFetch';
import { useTopicPreviews } from '../../hooks/useTopicPreviews';
import { Loading, ErrorBox, Empty, PageHeader } from '../../components/ui';
import TopicCard from '../../components/TopicCard';

export default function Topics() {
  const { data, loading, error, reload } = useFetch('/topics');
  const previews = useTopicPreviews(data);
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <div>
      <PageHeader title="Chọn chủ đề" />
      <p className="muted">Di chuột vào bộ bài để xòe và lật thử các lá.</p>
      {!data.length ? <Empty text="Hiện chưa có chủ đề nào." /> : (
        <div className="topic-grid">
          {data.map((t, i) => <TopicCard key={t.TopicID} topic={t} previews={previews[t.TopicID]} index={i} />)}
        </div>
      )}
    </div>
  );
}
