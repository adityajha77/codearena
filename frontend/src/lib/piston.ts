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
 * Helper to encode string to base64 with UTF-8 support for Judge0.
 */
function toBase64(str: string): string {
  try {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  } catch (e) {
    console.error("Base64 encoding failed", e);
    return btoa(str); // Fallback for simple strings
  }
}

/**
 * Helper to decode base64 to string with UTF-8 support
 */
function fromBase64(str: string | null): string {
  if (!str) return "";
  try {
    return decodeURIComponent(atob(str).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  } catch (e) {
    console.error("Base64 decoding failed", e);
    return atob(str);
  }
}

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

  // We use ?wait=true to get the result synchronously and base64_encoded=true for robustness
  const response = await fetch(`https://ce.judge0.com/submissions/?base64_encoded=true&wait=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      language_id: judge0Id,
      source_code: toBase64(sourceCode),
      stdin: toBase64(stdin),
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to execute code: ' + response.statusText);
  }

  const result = await response.json();
  
  // Since we sent base64_encoded=true, the output fields are also base64 encoded
  const stdout = fromBase64(result.stdout);
  const stderr = fromBase64(result.stderr);
  const compile_output = fromBase64(result.compile_output);

  // Judge0 returns various status codes. ID 3 is 'Accepted' (Success)
  const isSuccess = result.status?.id === 3;
  
  return {
    success: isSuccess,
    output: stdout || stderr || compile_output || "",
    status: result.status?.description,
    error: isSuccess ? undefined : (stderr || compile_output || result.status?.description)
  };
}

/**
 * Validates a user's code against a set of test cases.
 */
export async function validateTestCases(
  languageId: string,
  sourceCode: string,
  testCases: any[]
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
      const expected = (testCase.expected || testCase.expectedOutput || "").trim();
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
