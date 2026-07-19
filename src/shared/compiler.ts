// ***********************************************************************
// Runtime platform used when reporting Docker availability.
export type SupportedPlatform = 'win32' | 'darwin' | 'linux' | 'unknown'

// ***********************************************************************
// Docker Detection
export type DockerInstallationInfo = {
  containerId: 'docker'
  status: 'ready' | 'missing' | 'not-running'
  platform: SupportedPlatform
  message: string
  installInstruction: string | null
  path: string | null
  version: string | null
  source: 'auto' | 'manual' | null
}

// ***********************************************************************
// Docker Runtime Arguments
export const DOCKER_RUN_ARGS = [
  'run',
  '--rm', // Delete the container after it exits
  '--init' // Use faster init
] as const

export const DOCKER_SANDBOX_ARGS = [
  '--network',
  'none', // Disable network access
  '--cap-drop',
  'ALL', // Default to no capabilities
  '--security-opt',
  'no-new-privileges', // Help prevent privilege escalation
  '--pids-limit',
  '5', // Limit the number of child processes
  '--memory',
  '256m', // Limit memory for programs
  '--cpus',
  '1', // Limit CPU to 1 core
  '--memory-swap',
  '256m' // Prevent swap from extending the effective memory limit.
] as const

// ***********************************************************************
// Docker Compilation
export type DockerCompileRequest = {
  sourceFiles: string[]
}

export type DockerCompileResult = {
  success: boolean
  compileSuccess: boolean
  compilerPath: 'docker'
  executablePath: string | null
  sourceFiles: string[]
  stdout: string
  stderr: string
  message: string
}

// ***********************************************************************
// Docker Judge
export type DockerJudgeRequest = {
  executablePath: string
  stdin: string // Inputs
  expectedOutput: string // Some output file i.e. output0.txt
  timeoutMs: number // Alloted execution time
}

export type DockerJudgeResult = {
  passed: boolean
  timedOut: boolean
  expectedOutput: string
  actualOutput: string // The actual output from the judged program
}
