import { commands, ExtensionMode, window, type ExtensionContext } from "vscode"
import { AxonServer } from "./server"
import { AxonSidebarProvider } from "./sidebar"

let server: AxonServer | undefined

export function activate(context: ExtensionContext) {
  server = new AxonServer()
  const sidebar = new AxonSidebarProvider(context.extensionUri, server)

  context.subscriptions.push(
    window.registerWebviewViewProvider(AxonSidebarProvider.viewType, sidebar, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    commands.registerCommand("axon.openSidebar", () =>
      commands.executeCommand("workbench.view.extension.axonViewContainer"),
    ),
    commands.registerCommand("axon.restartServer", () => sidebar.restart()),
    server,
  )
  if (context.extensionMode === ExtensionMode.Test) {
    context.subscriptions.push(commands.registerCommand("axon.test.getSidebarState", () => sidebar.getState()))
  }
}

export function deactivate() {
  server?.dispose()
  server = undefined
}
