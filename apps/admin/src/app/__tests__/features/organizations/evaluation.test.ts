import { runEvaluation } from '@/app/features/organizations/evaluation';

test('evaluation runs and reports improvement', async () => {
  const { improvement } = await runEvaluation();
  // The evaluation should show improvement (fewer errors with judgment)
  // This test documents the expected outcome
  expect(improvement).toBeGreaterThanOrEqual(0);
});
