export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  status?: string;
}

// Judge0 Language IDs
const LANGUAGE_MAP: Record<string, number> = {
  javascript: 63, // Node.js
  python: 71,     // Python 3
  cpp: 54,        // C++ (GCC 9.2.0)
  java: 62,       // Java (OpenJDK 13.0.1)
  c: 50,          // C (GCC 9.2.0)
};

/**
 * Execute code using the Judge0 execution API.
 */
export async function executeCode(
  languageId: string,
  sourceCode: string,
  stdin: string = ''
): Promise<ExecutionResult> {
  const judge0Id = LANGUAGE_MAP[languageId];
  if (!judge0Id) {
    throw new Error(`Language ${languageId} is not supported by Judge0 API mapping.`);
  }

  // We use ?wait=true to get the result synchronously
  const response = await fetch(`https://ce.judge0.com/submissions/?base64_encoded=false&wait=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      language_id: judge0Id,
      source_code: sourceCode,
      stdin: stdin,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to execute code: ' + response.statusText);
  }

  const result = await response.json();
  
  // Judge0 returns various status codes. ID 3 is 'Accepted' (Success)
  const isSuccess = result.status?.id === 3;
  
  return {
    success: isSuccess,
    output: result.stdout || result.stderr || result.compile_output || "",
    status: result.status?.description,
    error: isSuccess ? undefined : (result.stderr || result.compile_output || result.status?.description)
  };
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
      
      if (!result.success && result.status !== "Wrong Answer") {
        return {
          success: false,
          error: result.status || 'Execution Error',
          details: result.error,
          passed: passedCount,
          total: testCases.length,
          results: results,
        };
      }

      const output = (result.output || "").trim();
      const expected = (testCase.expectedOutput || "").trim();
      const isCorrect = output === expected;

      if (isCorrect) passedCount++;

      results.push({
        input: testCase.input,
        expected,
        actual: output,
        passed: isCorrect,
      });
    } catch (error: any) {
      console.error("Execution failed for test case", testCase, error);
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
