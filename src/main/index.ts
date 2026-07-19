import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../build/icon.png?asset'
import { initDb } from './database/index'
import type { NewUser, UpdateUser, NewAssignment, UpdateAssignment } from './database/schema'
import { getAllUsers, createUser, updateUser, deleteUser } from './database/queries'
import { createSubmission, getSubmissionById } from './database/queries/submissionServices'
import { dialog } from 'electron'

import {
  getAllAssignments,
  createAssignment,
  updateAssignment,
  getAssignmentTestCases,
  replaceAssignmentTestCases
} from './database/queries'
import { deleteAssignment } from './database/queries'

import {
  createGradebookRecord,
  getGradebookRecords,
  clearGradebookRecords
} from './database/queries'

import {
  selectFile,
  stringifyFile,
  selectCppFiles,
  selectSubmissionFolder,
  selectFilesFromFolder,
  materializeServerSubmissions
} from './utils/file'

import { detectDockerInstallation } from './compiler/dockerDetection'

import { submitCppSubmission } from './submissions/submitCppSubmission'
import { dockerCompile } from './compiler/dockerCompile'
import { dockerJudge } from './compiler/dockerJudge'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  try {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.batchgrade.app')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // Initialize the database
    initDb()

    // IPC test
    ipcMain.on('ping', () => console.log('pong'))

    // Users CRUD
    ipcMain.handle('users:getAll', () => getAllUsers())
    ipcMain.handle('users:create', (_e, data: NewUser) => createUser(data))
    ipcMain.handle('users:update', (_e, data: UpdateUser) => updateUser(data))
    ipcMain.handle('users:delete', (_e, uuid: string) => deleteUser(uuid))

    // openFile operation FR1
    ipcMain.handle('dialog:openFile', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        // Only allows c++ files for now
        filters: [{ name: 'Source Files', extensions: ['cpp'] }]
      })
      if (result.canceled) return null
      return result.filePaths[0]
    })

    // Submissions CRUD
    ipcMain.handle(
      'submissions:create',
      (
        _e,
        data: {
          studentId: string
          assignmentId: string
          fileName: string
          filePath: string
        }
      ) => createSubmission(data)
    )

    // Gradebook (Local SQLite)
    ipcMain.handle('gradebook:getAll', () => getGradebookRecords())

    ipcMain.handle('gradebook:create', (_event, record) => createGradebookRecord(record))

    ipcMain.handle('gradebook:clear', () => clearGradebookRecords())

    ipcMain.handle('submissions:getById', (_e, submissionId: string) =>
      getSubmissionById(submissionId)
    )
    // Assignments CRUD
    ipcMain.handle('assignments:getAll', () => getAllAssignments())
    ipcMain.handle('assignments:create', (_event, data: NewAssignment) => createAssignment(data))
    ipcMain.handle('assignments:update', (_event, data: UpdateAssignment) => updateAssignment(data))
    ipcMain.handle('assignments:delete', (_event, uuid: string) => deleteAssignment(uuid))
    ipcMain.handle('assignments:getTestCases', (_event, assignmentUuid: string) =>
      getAssignmentTestCases(assignmentUuid)
    )
    ipcMain.handle('assignments:replaceTestCases', (_event, assignmentUuid: string, testCases) =>
      replaceAssignmentTestCases(assignmentUuid, testCases)
    )

    // Docker Detection
    ipcMain.handle('compiler:getDockerStatus', () => detectDockerInstallation())

    // File selection
    ipcMain.handle('file:select', () => selectFile())
    ipcMain.handle('file:selectCppFiles', () => selectCppFiles())
    ipcMain.handle('file:stringify', (_e, filePath: string) => stringifyFile(filePath))
    ipcMain.handle('file:selectSubmissionFolder', () => selectSubmissionFolder())
    ipcMain.handle('file:selectFilesFromFolder', () => selectFilesFromFolder())
    ipcMain.handle('file:materializeServerSubmissions', (_e, bundles) =>
      materializeServerSubmissions(bundles)
    )

    // Docker Compilation
    ipcMain.handle('compiler:dockerCompileCpp', async (_e, sourceFiles: string[]) => {
      return dockerCompile({ sourceFiles, language: 'cpp' })
    })

    // Docker Judge
    ipcMain.handle('compiler:dockerJudgeCpp', async (_e, request) => {
      return dockerJudge({ ...request, language: 'cpp' })
    })

    ipcMain.handle('submissions:submitCpp', (_e, request) => {
      return submitCppSubmission(request)
    })

    createWindow()

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  } catch (error) {
    console.error('BatchGrade failed during startup:', error)
    const message = error instanceof Error ? error.message : String(error)
    dialog.showErrorBox('BatchGrade failed to start', message)
    app.quit()
  }
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
