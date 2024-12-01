import QuizGame from 'app/(dashboard)/_components/QuizGame';

export default async function PlayQuiz({
  params
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <QuizGame quizId={quizId} />
    </div>
  );
}
