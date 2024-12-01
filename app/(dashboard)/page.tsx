import MusicQuizApp from './_components/MusicQuizApp';

export default async function DashboardPage(props: {
  searchParams: Promise<{ q: string; offset: string }>;
}) {
  return <MusicQuizApp />;
}
