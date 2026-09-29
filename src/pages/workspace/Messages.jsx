import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useDB } from '../../lib/store';
import { ThreadList, Conversation } from '../../components/Shell';
import { Card, EmptyState } from '../../components/ui';
import { PageHead } from './Layout';

export default function Messages() {
  const d = useDB();
  const me = d.session.userId;
  const threads = d.threads.filter((t) => t.participants.includes(me));
  const [active, setActive] = useState(threads[0]?.id || null);
  const thread = threads.find((t) => t.id === active);
  return (
    <>
      <PageHead title="Messages" sub="Every conversation with brands and creators" />
      <Card className="grid grid-cols-1 md:grid-cols-[320px_1fr] md:h-[620px] overflow-hidden">
        <div className={`border-b md:border-b-0 md:border-r border-line overflow-y-auto max-h-[260px] md:max-h-none ${thread ? 'hidden md:block' : ''}`}><ThreadList onPick={setActive} activeId={active} /></div>
        <div className={`min-w-0 h-[560px] md:h-auto ${thread ? '' : 'hidden md:block'}`}>
          {thread ? <Conversation key={thread.id} thread={thread} onBack={() => setActive(null)} /> : <div className="h-full grid place-items-center"><EmptyState icon={MessageSquare} title="Pick a conversation" /></div>}
        </div>
      </Card>
    </>
  );
}
