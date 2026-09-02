import React from 'react';
import { createClient } from '@/utils/supabase/client';

export default function Page() {
  const [todos, setTodos] = React.useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadTodos() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('todos').select();
        if (!error && data) {
          setTodos(data);
        }
      } catch (err) {
        console.error('Failed to load todos from Supabase:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTodos();
  }, []);

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading todos...</div>;
  }

  return (
    <ul className="p-4 space-y-2">
      {todos?.map((todo) => (
        <li key={todo.id} className="p-2 border rounded">
          {todo.name}
        </li>
      ))}
    </ul>
  );
}
