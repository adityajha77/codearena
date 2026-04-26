export interface ExecutionResult {
  run: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
}

const LANGUAGE_MAP: Record<string, { language: string; version: string }> = {
  javascript: { language: 'javascript', version: '18.15.0' },
  python: { language: 'python', version: '3.10.0' },
  cpp: { language: 'c++', version: '10.2.0' },
  java: { language: 'java', version: '15.0.2' },
  c: { language: 'c', version: '10.2.0' },
};

/**
 * Execute code using the Piston execution API.
 */
export async function executeCode(
  languageId: string,
  sourceCode: string,
  stdin: string = ''
): Promise<ExecutionResult> {
  const mapping = LANGUAGE_MAP[languageId];
  if (!mapping) {
    throw new Error(`Language ${languageId} is not supported by Piston API mapping.`);
  }

  const response = await fetch('https://emkc.org/api/v2/piston/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      language: mapping.language,
      version: mapping.version,
      files: [
        {
          content: sourceCode,
        },
      ],
      stdin: stdin,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to execute code: ' + response.statusText);
  }

  return response.json();
}

/**
 * Validates a user's code against a set of test cases.
 */
export async function validateTestCases(
  languageId: string,
  sourceCode: string,
  testCases: { input: string; expectedOutput: string }[]
) {
  let passedCount = 0;
  const results = [];

  for (const testCase of testCases) {
    try {
      const result = await executeCode(languageId, sourceCode, testCase.input);
      
      if (result.compile?.code !== 0 && result.compile?.code !== undefined) {
        return {
          success: false,
          error: 'Compilation Error',
          details: result.compile.stderr,
          passed: 0,
          total: testCases.length,
          results: [],
        };
      }

      const output = result.run.output.trim();
      const expected = testCase.expectedOutput.trim();
      const isCorrect = output === expected;

      if (isCorrect) passedCount++;

      results.push({
        input: testCase.input,
        expected,
        actual: output,
        passed: isCorrect,
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Execution failed',
        passed: passedCount,
        total: testCases.length,
        results,
      };
    }
  }

  return {
    success: passedCount === testCases.length,
    passed: passedCount,
    total: testCases.length,
    results,
  };
}
