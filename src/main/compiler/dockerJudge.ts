/*
  dockerJudge:
    - Judges program output using Docker execution
    - Supports multiple programming languages
    - Currently focused on C++
*/

import type { DockerJudgeRequest, DockerJudgeResult } from '../../shared/compiler'
import type { Language } from './languages'
import { dockerExecute } from './dockerExecute'

type DockerJudgeOptions = DockerJudgeRequest & {
  language: Language
}

// Helper function to clean and normalize output for comparison
async function cleanOutput(output: string): Promise<string> {
  return output.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n+$/, '')
}

/**
 * Judges a compiled program by executing it in Docker and comparing its output to the expected output.
 * @param request - The judging request containing the executable path, stdin, expected output, timeout, and language.
 * @returns A promise that resolves to the judging result.
 */
async function dockerJudge(request: DockerJudgeOptions): Promise<DockerJudgeResult> {
  const { executablePath, stdin, expectedOutput, timeoutMs, language } = request

  // Execute the program
  const executionResult = await dockerExecute({
    executablePath,
    stdin,
    timeoutMs,
    language
  })

  // Compare cleaned outputs
  const outputMatches =
    (await cleanOutput(executionResult.stdout)) === (await cleanOutput(expectedOutput))

  // Program must execute successfully and output must match
  const passed = executionResult.success && outputMatches

  return {
    passed,
    timedOut: executionResult.timedOut,
    expectedOutput,
    actualOutput: executionResult.stdout
  }
}

export { dockerJudge, type DockerJudgeRequest, type DockerJudgeResult }
