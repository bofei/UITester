   var WebInspector = {};/*
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2007 Matt Lilek (pewtermoose@gmail.com).
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var WebInspector = {
    resources: {},
    missingLocalizedStrings: {},
    pendingDispatches: 0,

    get platform()
    {
        
        return "windows";
    },

    get platformFlavor()
    {
        if (!("_platformFlavor" in this))
            this._platformFlavor = this._detectPlatformFlavor();

        return this._platformFlavor;
    },

    _detectPlatformFlavor: function()
    {
        const userAgent = navigator.userAgent;

        if (this.platform === "windows") {
            var match = userAgent.match(/Windows NT (\d+)\.(?:\d+)/);
            if (match && match[1] >= 6)
                return WebInspector.PlatformFlavor.WindowsVista;
            return null;
        } else if (this.platform === "mac") {
            var match = userAgent.match(/Mac OS X\s*(?:(\d+)_(\d+))?/);
            if (!match || match[1] != 10)
                return WebInspector.PlatformFlavor.MacSnowLeopard;
            switch (Number(match[2])) {
                case 4:
                    return WebInspector.PlatformFlavor.MacTiger;
                case 5:
                    return WebInspector.PlatformFlavor.MacLeopard;
                case 6:
                default:
                    return WebInspector.PlatformFlavor.MacSnowLeopard;
            }
        }

        return null;
    },

    get port()
    {
        if (!("_port" in this))
            this._port = InspectorFrontendHost.port();

        return this._port;
    },

    get previousFocusElement()
    {
        return this._previousFocusElement;
    },

    get currentFocusElement()
    {
        return this._currentFocusElement;
    },

    set currentFocusElement(x)
    {
        if (this._currentFocusElement !== x)
            this._previousFocusElement = this._currentFocusElement;
        this._currentFocusElement = x;

        if (this._currentFocusElement) {
            this._currentFocusElement.focus();

            // Make a caret selection inside the new element if there isn't a range selection and
            // there isn't already a caret selection inside.
            var selection = window.getSelection();
            if (selection.isCollapsed && !this._currentFocusElement.isInsertionCaretInside()) {
                var selectionRange = this._currentFocusElement.ownerDocument.createRange();
                selectionRange.setStart(this._currentFocusElement, 0);
                selectionRange.setEnd(this._currentFocusElement, 0);

                selection.removeAllRanges();
                selection.addRange(selectionRange);
            }
        } else if (this._previousFocusElement)
            this._previousFocusElement.blur();
    },

    currentPanel: function()
    {
        return this._currentPanel;
    },

    setCurrentPanel: function(x)
    {
        if (this._currentPanel === x)
            return;

        if (this._currentPanel)
            this._currentPanel.detach();

        this._currentPanel = x;

        if (x) {
            x.show();
            WebInspector.searchController.activePanelChanged();
        }
        for (var panelName in WebInspector.panels) {
            if (WebInspector.panels[panelName] === x) {
                WebInspector.settings.lastActivePanel.set(panelName);
                this._panelHistory.setPanel(panelName);
                WebInspector.userMetrics.panelShown(panelName);
            }
        }

        this._toggleConsoleButton.disabled = this._currentPanel === WebInspector.panels.console;
    },

    _createPanels: function()
    {
        if (WebInspector.WorkerManager.isWorkerFrontend()) {
            this.panels.scripts = new WebInspector.ScriptsPanel(this.debuggerPresentationModel);
            this.panels.console = new WebInspector.ConsolePanel();
            return;
        }
        var hiddenPanels = (InspectorFrontendHost.hiddenPanels() || "").split(',');
        if (hiddenPanels.indexOf("elements") === -1)
            this.panels.elements = new WebInspector.ElementsPanel();
        if (hiddenPanels.indexOf("resources") === -1)
            this.panels.resources = new WebInspector.ResourcesPanel();
        if (hiddenPanels.indexOf("network") === -1)
            this.panels.network = new WebInspector.NetworkPanel();
        if (hiddenPanels.indexOf("scripts") === -1)
            this.panels.scripts = new WebInspector.ScriptsPanel(this.debuggerPresentationModel);
        if (hiddenPanels.indexOf("timeline") === -1)
            this.panels.timeline = new WebInspector.TimelinePanel();
        if (hiddenPanels.indexOf("profiles") === -1)
            this.panels.profiles = new WebInspector.ProfilesPanel();
        if (hiddenPanels.indexOf("audits") === -1)
            this.panels.audits = new WebInspector.AuditsPanel();
        if (hiddenPanels.indexOf("console") === -1)
            this.panels.console = new WebInspector.ConsolePanel();
    },

    _createGlobalStatusBarItems: function()
    {
        this._dockToggleButton = new WebInspector.StatusBarButton(this._dockButtonTitle(), "dock-status-bar-item");
        this._dockToggleButton.addEventListener("click", this._toggleAttach.bind(this), false);
        this._dockToggleButton.toggled = !this.attached;

        this._settingsButton = new WebInspector.StatusBarButton(WebInspector.UIString("Settings"), "settings-status-bar-item");
        this._settingsButton.addEventListener("click", this._toggleSettings.bind(this), false);

        var anchoredStatusBar = document.getElementById("anchored-status-bar-items");
        anchoredStatusBar.appendChild(this._dockToggleButton.element);

        this._toggleConsoleButton = new WebInspector.StatusBarButton(WebInspector.UIString("Show console."), "console-status-bar-item");
        this._toggleConsoleButton.addEventListener("click", this._toggleConsoleButtonClicked.bind(this), false);
        anchoredStatusBar.appendChild(this._toggleConsoleButton.element);

        if (this.panels.elements)
            anchoredStatusBar.appendChild(this.panels.elements.nodeSearchButton.element);
        anchoredStatusBar.appendChild(this._settingsButton.element);
    },

    _dockButtonTitle: function()
    {
        return this.attached ? WebInspector.UIString("Undock into separate window.") : WebInspector.UIString("Dock to main window.");
    },

    _toggleAttach: function()
    {
        if (!this._attached) {
            InspectorFrontendHost.requestAttachWindow();
            WebInspector.userMetrics.WindowDocked.record();
        } else {
            InspectorFrontendHost.requestDetachWindow();
            WebInspector.userMetrics.WindowUndocked.record();
        }
    },

    _toggleConsoleButtonClicked: function()
    {
        if (this._toggleConsoleButton.disabled)
            return;

        this._toggleConsoleButton.toggled = !this._toggleConsoleButton.toggled;

        var animationType = window.event && window.event.shiftKey ? WebInspector.Drawer.AnimationType.Slow : WebInspector.Drawer.AnimationType.Normal;
        if (this._toggleConsoleButton.toggled) {
            this._toggleConsoleButton.title = WebInspector.UIString("Hide console.");
            this.drawer.show(this.consoleView, animationType);
            this._consoleWasShown = true;
        } else {
            this._toggleConsoleButton.title = WebInspector.UIString("Show console.");
            this.drawer.hide(animationType);
            delete this._consoleWasShown;
        }
    },

    _escPressed: function()
    {
        // If drawer was open with some view other than console then just close it.
        if (!this._consoleWasShown && WebInspector.drawer.visible)
            this.drawer.hide(WebInspector.Drawer.AnimationType.Immediately);
        else
            this._toggleConsoleButtonClicked();
    },

    /**
     * @param {WebInspector.View} view
     */
    showViewInDrawer: function(view)
    {
        this._toggleConsoleButton.title = WebInspector.UIString("Hide console.");
        this._toggleConsoleButton.toggled = false;
        this.drawer.show(view, WebInspector.Drawer.AnimationType.Immediately);
    },

    _toggleSettings: function()
    {
        this._settingsButton.toggled = !this._settingsButton.toggled;
        if (this._settingsButton.toggled)
            this._showSettingsScreen();
        else
            this._hideSettingsScreen();
    },

    _showShortcutsScreen: function()
    {
        this._hideSettingsScreen();
        WebInspector.shortcutsScreen.show();
    },

    _hideShortcutsScreen: function()
    {
        WebInspector.shortcutsScreen.hide();
    },

    _showSettingsScreen: function()
    {
        this._hideShortcutsScreen();
        function onhide()
        {
            this._settingsButton.toggled = false;
            delete this._settingsScreen;
        }

        if (!this._settingsScreen) {
            this._settingsScreen = new WebInspector.SettingsScreen();
            this._settingsScreen.show(onhide.bind(this));
        }
    },

    _hideSettingsScreen: function()
    {
        if (this._settingsScreen) {
            this._settingsScreen.hide();
            this._settingsButton.toggled = false;
            delete this._settingsScreen;
        }
    },

    get attached()
    {
        return this._attached;
    },

    set attached(x)
    {
        if (this._attached === x)
            return;

        this._attached = x;

        var body = document.body;

        if (x) {
            body.removeStyleClass("detached");
            body.addStyleClass("attached");
        } else {
            body.removeStyleClass("attached");
            body.addStyleClass("detached");
        }

        if (this._dockToggleButton) {
            this._dockToggleButton.title = this._dockButtonTitle();
            this._dockToggleButton.toggled = !x;
        }

        // This may be called before doLoadedDone, hence the bulk of inspector objects may
        // not be created yet.
        if (WebInspector.toolbar)
            WebInspector.toolbar.attached = x;

        if (WebInspector.searchController)
            WebInspector.searchController.updateSearchLabel();

        if (WebInspector.drawer)
            WebInspector.drawer.resize();
    },

    _updateErrorAndWarningCounts: function()
    {
        var errorWarningElement = document.getElementById("error-warning-count");
        if (!errorWarningElement)
            return;

        var errors = WebInspector.console.errors;
        var warnings = WebInspector.console.warnings;
        if (!errors && !warnings) {
            errorWarningElement.addStyleClass("hidden");
            return;
        }

        errorWarningElement.removeStyleClass("hidden");

        errorWarningElement.removeChildren();

        if (errors) {
            var errorElement = document.createElement("span");
            errorElement.id = "error-count";
            errorElement.textContent = errors;
            errorWarningElement.appendChild(errorElement);
        }

        if (warnings) {
            var warningsElement = document.createElement("span");
            warningsElement.id = "warning-count";
            warningsElement.textContent = warnings;
            errorWarningElement.appendChild(warningsElement);
        }

        if (errors) {
            if (warnings) {
                if (errors == 1) {
                    if (warnings == 1)
                        errorWarningElement.title = WebInspector.UIString("%d error, %d warning", errors, warnings);
                    else
                        errorWarningElement.title = WebInspector.UIString("%d error, %d warnings", errors, warnings);
                } else if (warnings == 1)
                    errorWarningElement.title = WebInspector.UIString("%d errors, %d warning", errors, warnings);
                else
                    errorWarningElement.title = WebInspector.UIString("%d errors, %d warnings", errors, warnings);
            } else if (errors == 1)
                errorWarningElement.title = WebInspector.UIString("%d error", errors);
            else
                errorWarningElement.title = WebInspector.UIString("%d errors", errors);
        } else if (warnings == 1)
            errorWarningElement.title = WebInspector.UIString("%d warning", warnings);
        else if (warnings)
            errorWarningElement.title = WebInspector.UIString("%d warnings", warnings);
        else
            errorWarningElement.title = null;
    },

    networkResourceById: function(id)
    {
        return this.panels.network.resourceById(id);
    },

    forAllResources: function(callback)
    {
        WebInspector.resourceTreeModel.forAllResources(callback);
    },

    resourceForURL: function(url)
    {
        return this.resourceTreeModel.resourceForURL(url);
    }
}

WebInspector.Events = {
    InspectorClosing: "InspectorClosing"
}

{(function parseQueryParameters()
{
    WebInspector.queryParamsObject = {};
    var queryParams = window.location.search;
    if (!queryParams)
        return;
    var params = queryParams.substring(1).split("&");
    for (var i = 0; i < params.length; ++i) {
        var pair = params[i].split("=");
        WebInspector.queryParamsObject[pair[0]] = pair[1];
    }
})();}

WebInspector.loaded = function()
{
    if ("page" in WebInspector.queryParamsObject) {
        var page = WebInspector.queryParamsObject.page;
        var host = "host" in WebInspector.queryParamsObject ? WebInspector.queryParamsObject.host : window.location.host;
        WebInspector.socket = new WebSocket("ws://" + host + "/devtools/page/" + page);
        WebInspector.socket.onmessage = function(message) { InspectorBackend.dispatch(message.data); }
        WebInspector.socket.onerror = function(error) { console.error(error); }
        WebInspector.socket.onopen = function() {
            InspectorFrontendHost.sendMessageToBackend = WebInspector.socket.send.bind(WebInspector.socket);
            WebInspector.doLoadedDone();
        }
        return;
    }
    WebInspector.WorkerManager.loaded();
    WebInspector.doLoadedDone();
}

WebInspector.doLoadedDone = function()
{
    InspectorFrontendHost.loaded();

    var platform = WebInspector.platform;
    document.body.addStyleClass("platform-" + platform);
    var flavor = WebInspector.platformFlavor;
    if (flavor)
        document.body.addStyleClass("platform-" + flavor);
    var port = WebInspector.port;
    document.body.addStyleClass("port-" + port);
    if (WebInspector.socket)
        document.body.addStyleClass("remote");

    this._registerShortcuts();

    // set order of some sections explicitly
    WebInspector.shortcutsScreen.section(WebInspector.UIString("Console"));
    WebInspector.shortcutsScreen.section(WebInspector.UIString("Elements Panel"));

    this.console = new WebInspector.ConsoleModel();
    this.console.addEventListener(WebInspector.ConsoleModel.Events.ConsoleCleared, this._updateErrorAndWarningCounts, this);
    this.console.addEventListener(WebInspector.ConsoleModel.Events.MessageAdded, this._updateErrorAndWarningCounts, this);
    this.console.addEventListener(WebInspector.ConsoleModel.Events.RepeatCountUpdated, this._updateErrorAndWarningCounts, this);

    this.debuggerModel = new WebInspector.DebuggerModel();
    this.debuggerPresentationModel = new WebInspector.DebuggerPresentationModel();

    this.drawer = new WebInspector.Drawer();
    this.consoleView = new WebInspector.ConsoleView(WebInspector.WorkerManager.isWorkerFrontend());

    this.networkManager = new WebInspector.NetworkManager();
    this.resourceTreeModel = new WebInspector.ResourceTreeModel();
    this.networkLog = new WebInspector.NetworkLog();
    this.domAgent = new WebInspector.DOMAgent();
    new WebInspector.JavaScriptContextManager(this.resourceTreeModel, this.consoleView);

    InspectorBackend.registerInspectorDispatcher(this);

    this.cssModel = new WebInspector.CSSStyleModel();

    this.searchController = new WebInspector.SearchController();
    this.advancedSearchController = new WebInspector.AdvancedSearchController();

    if (Preferences.nativeInstrumentationEnabled)
        this.domBreakpointsSidebarPane = new WebInspector.DOMBreakpointsSidebarPane();

    this.panels = {};
    this._createPanels();
    this._createGlobalStatusBarItems();

    this._panelHistory = new WebInspector.PanelHistory();
    this.toolbar = new WebInspector.Toolbar();
    this.toolbar.attached = WebInspector.attached;

    this.panelOrder = [];
    for (var panelName in this.panels)
        this.addPanel(this.panels[panelName]);

    this.addMainEventListeners(document);

    window.addEventListener("resize", this.windowResize.bind(this), true);

    var errorWarningCount = document.getElementById("error-warning-count");
    errorWarningCount.addEventListener("click", this.showConsole.bind(this), false);
    this._updateErrorAndWarningCounts();

    var autoselectPanel = WebInspector.UIString("a panel chosen automatically");
    var openAnchorLocationSetting = WebInspector.settings.createSetting("openLinkHandler", autoselectPanel);
    this.openAnchorLocationRegistry = new WebInspector.HandlerRegistry(openAnchorLocationSetting);
    this.openAnchorLocationRegistry.registerHandler(autoselectPanel, function() { return false; });

    this.extensionServer.initExtensions();

    // There is no console agent for workers yet.
    if (!WebInspector.WorkerManager.isWorkerFrontend())
        this.console.enableAgent();
    DatabaseAgent.enable();
    DOMStorageAgent.enable();

    WebInspector.showPanel(WebInspector.settings.lastActivePanel.get());

    WebInspector.CSSCompletions.requestCSSNameCompletions();
}

WebInspector.addPanel = function(panel)
{
    this.panelOrder.push(panel);
    this.toolbar.addPanel(panel);
}

var windowLoaded = function()
{
   
};

//window.addEventListener("DOMContentLoaded", windowLoaded, false);

// We'd like to enforce asynchronous interaction between the inspector controller and the frontend.
// It is needed to prevent re-entering the backend code.
// Also, native dispatches do not guarantee setTimeouts to be serialized, so we
// enforce serialization using 'messagesToDispatch' queue. It is also important that JSC debugger
// tests require that each command was dispatch within individual timeout callback, so we don't batch them.

var messagesToDispatch = [];

WebInspector.dispatchQueueIsEmpty = function() {
    return messagesToDispatch.length == 0;
}

WebInspector.dispatch = function(message) {
    messagesToDispatch.push(message);
    setTimeout(function() {
        InspectorBackend.dispatch(messagesToDispatch.shift());
    }, 0);
}

WebInspector.dispatchMessageFromBackend = function(messageObject)
{
    WebInspector.dispatch(messageObject);
}

WebInspector.windowResize = function(event)
{
    if (this.currentPanel())
        this.currentPanel().doResize();
    this.drawer.resize();
    this.toolbar.resize();
}

WebInspector.windowFocused = function(event)
{
    // Fires after blur, so when focusing on either the main inspector
    // or an <iframe> within the inspector we should always remove the
    // "inactive" class.
    if (event.target.document.nodeType === Node.DOCUMENT_NODE)
        document.body.removeStyleClass("inactive");
}

WebInspector.windowBlurred = function(event)
{
    // Leaving the main inspector or an <iframe> within the inspector.
    // We can add "inactive" now, and if we are moving the focus to another
    // part of the inspector then windowFocused will correct this.
    if (event.target.document.nodeType === Node.DOCUMENT_NODE)
        document.body.addStyleClass("inactive");
}

WebInspector.focusChanged = function(event)
{
    this.currentFocusElement = event.target;
}

WebInspector.setAttachedWindow = function(attached)
{
    this.attached = attached;
}

WebInspector.close = function(event)
{
    if (this._isClosing)
        return;
    this._isClosing = true;
    this.notifications.dispatchEventToListeners(WebInspector.Events.InspectorClosing);
    InspectorFrontendHost.closeWindow();
}

WebInspector.disconnectFromBackend = function()
{
    InspectorFrontendHost.disconnectFromBackend();
}

WebInspector.documentClick = function(event)
{
    var anchor = event.target.enclosingNodeOrSelfWithNodeName("a");
    if (!anchor || anchor.target === "_blank")
        return;

    // Prevent the link from navigating, since we don't do any navigation by following links normally.
    event.preventDefault();
    event.stopPropagation();

    function followLink()
    {
        if (WebInspector._showAnchorLocation(anchor))
            return;

        const profileMatch = WebInspector.ProfileType.URLRegExp.exec(anchor.href);
        if (profileMatch) {
            WebInspector.showProfileForURL(anchor.href);
            return;
        }

        var parsedURL = anchor.href.asParsedURL();
        if (parsedURL && parsedURL.scheme === "webkit-link-action") {
            if (parsedURL.host === "show-panel") {
                var panel = parsedURL.path.substring(1);
                if (WebInspector.panels[panel])
                    WebInspector.showPanel(panel);
            }
            return;
        }

        WebInspector.showPanel("resources");
    }

    if (WebInspector.followLinkTimeout)
        clearTimeout(WebInspector.followLinkTimeout);

    if (anchor.preventFollowOnDoubleClick) {
        // Start a timeout if this is the first click, if the timeout is canceled
        // before it fires, then a double clicked happened or another link was clicked.
        if (event.detail === 1)
            WebInspector.followLinkTimeout = setTimeout(followLink, 333);
        return;
    }

    followLink();
}

WebInspector.openResource = function(resourceURL, inResourcesPanel)
{
    var resource = WebInspector.resourceForURL(resourceURL);
    if (inResourcesPanel && resource) {
        WebInspector.panels.resources.showResource(resource);
        WebInspector.showPanel("resources");
    } else
        PageAgent.open(resourceURL, true);
}

WebInspector.openRequestInNetworkPanel = function(resource)
{
    WebInspector.showPanel("network");
    WebInspector.panels.network.revealAndHighlightResource(resource);
}

WebInspector._registerShortcuts = function()
{
    var shortcut = WebInspector.KeyboardShortcut;
    var section = WebInspector.shortcutsScreen.section(WebInspector.UIString("All Panels"));
    var keys = [
        shortcut.shortcutToString("]", shortcut.Modifiers.CtrlOrMeta),
        shortcut.shortcutToString("[", shortcut.Modifiers.CtrlOrMeta)
    ];
    section.addRelatedKeys(keys, WebInspector.UIString("Next/previous panel"));
    section.addKey(shortcut.shortcutToString(shortcut.Keys.Esc), WebInspector.UIString("Toggle console"));
    section.addKey(shortcut.shortcutToString("f", shortcut.Modifiers.CtrlOrMeta), WebInspector.UIString("Search"));
    if (WebInspector.isMac()) {
        keys = [
            shortcut.shortcutToString("g", shortcut.Modifiers.Meta),
            shortcut.shortcutToString("g", shortcut.Modifiers.Meta | shortcut.Modifiers.Shift)
        ];
        section.addRelatedKeys(keys, WebInspector.UIString("Find next/previous"));
    }

    var goToShortcut = WebInspector.GoToLineDialog.createShortcut();
    section.addKey(goToShortcut.name, WebInspector.UIString("Go to Line"));
}

WebInspector.documentKeyDown = function(event)
{
    var isInputElement = event.target.nodeName === "INPUT";
    var isInEditMode = event.target.enclosingNodeOrSelfWithClass("text-prompt") || WebInspector.isEditingAnyField();
    const helpKey = WebInspector.isMac() ? "U+003F" : "U+00BF"; // "?" for both platforms

    if (event.keyIdentifier === "F1" ||
        (event.keyIdentifier === helpKey && event.shiftKey && (!isInEditMode && !isInputElement || event.metaKey))) {
        this._showShortcutsScreen();
        event.stopPropagation();
        event.preventDefault();
        return;
    }

    if (this.currentFocusElement && this.currentFocusElement.handleKeyEvent) {
        this.currentFocusElement.handleKeyEvent(event);
        if (event.handled) {
            event.preventDefault();
            return;
        }
    }

    if (this.currentPanel()) {
        this.currentPanel().handleShortcut(event);
        if (event.handled) {
            event.preventDefault();
            return;
        }
    }

    WebInspector.searchController.handleShortcut(event);
    WebInspector.advancedSearchController.handleShortcut(event);
    if (event.handled) {
        event.preventDefault();
        return;
    }

    if (WebInspector.isEditingAnyField())
        return;

    var isMac = WebInspector.isMac();
    switch (event.keyIdentifier) {
        case "Left":
            var isBackKey = !isInEditMode && (isMac ? event.metaKey : event.ctrlKey);
            if (isBackKey && this._panelHistory.canGoBack()) {
                this._panelHistory.goBack();
                event.preventDefault();
            }
            break;

        case "Right":
            var isForwardKey = !isInEditMode && (isMac ? event.metaKey : event.ctrlKey);
            if (isForwardKey && this._panelHistory.canGoForward()) {
                this._panelHistory.goForward();
                event.preventDefault();
            }
            break;

        case "U+001B": // Escape key
            event.preventDefault();
            this._escPressed();
            break;

        // Windows and Mac have two different definitions of [, so accept both.
        case "U+005B":
        case "U+00DB": // [ key
            if (isMac)
                var isRotateLeft = event.metaKey && !event.shiftKey && !event.ctrlKey && !event.altKey;
            else
                var isRotateLeft = event.ctrlKey && !event.shiftKey && !event.metaKey && !event.altKey;

            if (isRotateLeft) {
                var index = this.panelOrder.indexOf(this.currentPanel());
                index = (index === 0) ? this.panelOrder.length - 1 : index - 1;
                this.panelOrder[index].toolbarItem.click();
                event.preventDefault();
            }

            break;

        // Windows and Mac have two different definitions of ], so accept both.
        case "U+005D":
        case "U+00DD":  // ] key
            if (isMac)
                var isRotateRight = event.metaKey && !event.shiftKey && !event.ctrlKey && !event.altKey;
            else
                var isRotateRight = event.ctrlKey && !event.shiftKey && !event.metaKey && !event.altKey;

            if (isRotateRight) {
                var index = this.panelOrder.indexOf(this.currentPanel());
                index = (index + 1) % this.panelOrder.length;
                this.panelOrder[index].toolbarItem.click();
                event.preventDefault();
            }

            break;

        case "U+0052": // R key
            if ((event.metaKey && isMac) || (event.ctrlKey && !isMac)) {
                PageAgent.reload(event.shiftKey);
                event.preventDefault();
            }
            break;
        case "F5":
            if (!isMac) {
                PageAgent.reload(event.ctrlKey || event.shiftKey);
                event.preventDefault();
            }
            break;
    }
}

WebInspector.documentCanCopy = function(event)
{
    if (this.currentPanel() && this.currentPanel().handleCopyEvent)
        event.preventDefault();
}

WebInspector.documentCopy = function(event)
{
    if (this.currentPanel() && this.currentPanel().handleCopyEvent)
        this.currentPanel().handleCopyEvent(event);
}

WebInspector.contextMenuEventFired = function(event)
{
    if (event.handled || event.target.hasStyleClass("popup-glasspane"))
        event.preventDefault();
}

WebInspector.toggleSearchingForNode = function()
{
    if (this.panels.elements) {
        this.showPanel("elements");
        this.panels.elements.toggleSearchingForNode();
    }
}

WebInspector.showConsole = function()
{
    if (WebInspector._toggleConsoleButton && !WebInspector._toggleConsoleButton.toggled)
        WebInspector._toggleConsoleButtonClicked();
}

WebInspector.showPanel = function(panel)
{
    if (!(panel in this.panels)) {
        if (WebInspector.WorkerManager.isWorkerFrontend())
            panel = "scripts";
        else
            panel = "elements";
    }
    this.setCurrentPanel(this.panels[panel]);
}

WebInspector.startUserInitiatedDebugging = function()
{
    this.setCurrentPanel(this.panels.scripts);
    WebInspector.debuggerModel.enableDebugger();
}

WebInspector.reset = function()
{
    this.debuggerModel.reset();
    for (var panelName in this.panels) {
        var panel = this.panels[panelName];
        if ("reset" in panel)
            panel.reset();
    }

    this.domAgent.hideDOMNodeHighlight();

    if (!WebInspector.settings.preserveConsoleLog.get())
        this.console.clearMessages();
    this.extensionServer.notifyInspectorReset();
    if (this.workerManager)
        this.workerManager.reset();
}

WebInspector.bringToFront = function()
{
    InspectorFrontendHost.bringToFront();
}

WebInspector.didCreateWorker = function()
{
    var workersPane = WebInspector.panels.scripts.sidebarPanes.workers;
    if (workersPane)
        workersPane.addWorker.apply(workersPane, arguments);
}

WebInspector.didDestroyWorker = function()
{
    var workersPane = WebInspector.panels.scripts.sidebarPanes.workers;
    if (workersPane)
        workersPane.removeWorker.apply(workersPane, arguments);
}

/**
 * @param {string=} messageLevel
 * @param {boolean=} showConsole
 */
WebInspector.log = function(message, messageLevel, showConsole)
{
    // remember 'this' for setInterval() callback
    var self = this;

    // return indication if we can actually log a message
    function isLogAvailable()
    {
        return WebInspector.ConsoleMessage && WebInspector.RemoteObject && self.console;
    }

    // flush the queue of pending messages
    function flushQueue()
    {
        var queued = WebInspector.log.queued;
        if (!queued)
            return;

        for (var i = 0; i < queued.length; ++i)
            logMessage(queued[i]);

        delete WebInspector.log.queued;
    }

    // flush the queue if it console is available
    // - this function is run on an interval
    function flushQueueIfAvailable()
    {
        if (!isLogAvailable())
            return;

        clearInterval(WebInspector.log.interval);
        delete WebInspector.log.interval;

        flushQueue();
    }

    // actually log the message
    function logMessage(message)
    {
        var repeatCount = 1;
        if (message == WebInspector.log.lastMessage)
            repeatCount = WebInspector.log.repeatCount + 1;

        WebInspector.log.lastMessage = message;
        WebInspector.log.repeatCount = repeatCount;

        // ConsoleMessage expects a proxy object
        message = WebInspector.RemoteObject.fromPrimitiveValue(message);

        // post the message
        var msg = WebInspector.ConsoleMessage.create(
            WebInspector.ConsoleMessage.MessageSource.Other,
            WebInspector.ConsoleMessage.MessageType.Log,
            messageLevel || WebInspector.ConsoleMessage.MessageLevel.Debug,
            -1,
            null,
            repeatCount,
            null,
            [message],
            null);

        self.console.addMessage(msg);
        if (showConsole)
            WebInspector.showConsole();
    }

    // if we can't log the message, queue it
    if (!isLogAvailable()) {
        if (!WebInspector.log.queued)
            WebInspector.log.queued = [];

        WebInspector.log.queued.push(message);

        if (!WebInspector.log.interval)
            WebInspector.log.interval = setInterval(flushQueueIfAvailable, 1000);

        return;
    }

    // flush the pending queue if any
    flushQueue();

    // log the message
    logMessage(message);
}

WebInspector.inspect = function(payload, hints)
{
    var object = WebInspector.RemoteObject.fromPayload(payload);
    if (object.subtype === "node") {
        // Request node from backend and focus it.
        object.pushNodeToFrontend(WebInspector.updateFocusedNode.bind(WebInspector), object.release.bind(object));
        return;
    }

    if (hints.databaseId) {
        WebInspector.setCurrentPanel(WebInspector.panels.resources);
        WebInspector.panels.resources.selectDatabase(hints.databaseId);
    } else if (hints.domStorageId) {
        WebInspector.setCurrentPanel(WebInspector.panels.resources);
        WebInspector.panels.resources.selectDOMStorage(hints.domStorageId);
    }

    object.release();
}

WebInspector.updateFocusedNode = function(nodeId)
{
    this.panels.elements.revealAndSelectNode(nodeId);
}

WebInspector.displayNameForURL = function(url)
{
    if (!url)
        return "";

    var resource = this.resourceForURL(url);
    if (resource)
        return resource.displayName;

    if (!WebInspector.mainResource)
        return url.trimURL("");

    var lastPathComponent = WebInspector.mainResource.lastPathComponent;
    var index = WebInspector.mainResource.url.indexOf(lastPathComponent);
    if (index !== -1 && index + lastPathComponent.length === WebInspector.mainResource.url.length) {
        var baseURL = WebInspector.mainResource.url.substring(0, index);
        if (url.indexOf(baseURL) === 0)
            return url.substring(index);
    }

    return url.trimURL(WebInspector.mainResource.domain);
}

WebInspector._showAnchorLocation = function(anchor)
{
    if (WebInspector.openAnchorLocationRegistry.dispatch(anchor))
        return true;
    var preferedPanel = this.panels[anchor.getAttribute("preferred_panel") || "resources"];
    if (WebInspector._showAnchorLocationInPanel(anchor, preferedPanel))
        return true;
    if (preferedPanel !== this.panels.resources && WebInspector._showAnchorLocationInPanel(anchor, this.panels.resources))
        return true;
    return false;
}

WebInspector._showAnchorLocationInPanel = function(anchor, panel)
{
    if (!panel.canShowAnchorLocation(anchor))
        return false;

    // FIXME: support webkit-html-external-link links here.
    if (anchor.hasStyleClass("webkit-html-external-link")) {
        anchor.removeStyleClass("webkit-html-external-link");
        anchor.addStyleClass("webkit-html-resource-link");
    }

    WebInspector.searchController.disableSearchUntilExplicitAction();
    this.setCurrentPanel(panel);
    if (this.drawer)
        this.drawer.immediatelyFinishAnimation();
    this.currentPanel().showAnchorLocation(anchor);
    return true;
}

WebInspector.linkifyStringAsFragmentWithCustomLinkifier = function(string, linkifier)
{
    var container = document.createDocumentFragment();
    var linkStringRegEx = /(?:[a-zA-Z][a-zA-Z0-9+.-]{2,}:\/\/|www\.)[\w$\-_+*'=\|\/\\(){}[\]%@&#~,:;.!?]{2,}[\w$\-_+*=\|\/\\({%@&#~]/;
    var lineColumnRegEx = /:(\d+)(:(\d+))?$/;

    while (string) {
        var linkString = linkStringRegEx.exec(string);
        if (!linkString)
            break;

        linkString = linkString[0];
        var linkIndex = string.indexOf(linkString);
        var nonLink = string.substring(0, linkIndex);
        container.appendChild(document.createTextNode(nonLink));

        var title = linkString;
        var realURL = (linkString.indexOf("www.") === 0 ? "http://" + linkString : linkString);
        var lineColumnMatch = lineColumnRegEx.exec(realURL);
        if (lineColumnMatch)
            realURL = realURL.substring(0, realURL.length - lineColumnMatch[0].length);

        var linkNode = linkifier(title, realURL, lineColumnMatch ? lineColumnMatch[1] : undefined);
        container.appendChild(linkNode);
        string = string.substring(linkIndex + linkString.length, string.length);
    }

    if (string)
        container.appendChild(document.createTextNode(string));

    return container;
}

WebInspector.linkifyStringAsFragment = function(string)
{
    function linkifier(title, url, lineNumber)
    {
        var profileStringMatches = WebInspector.ProfileType.URLRegExp.exec(title);
        if (profileStringMatches)
            title = WebInspector.panels.profiles.displayTitleForProfileLink(profileStringMatches[2], profileStringMatches[1]);

        var isExternal = !WebInspector.resourceForURL(url);
        var urlNode = WebInspector.linkifyURLAsNode(url, title, null, isExternal);
        if (typeof(lineNumber) !== "undefined") {
            urlNode.setAttribute("line_number", lineNumber);
            urlNode.setAttribute("preferred_panel", "scripts");
        }

        return urlNode;
    }

    return WebInspector.linkifyStringAsFragmentWithCustomLinkifier(string, linkifier);
}

WebInspector.showProfileForURL = function(url)
{
    WebInspector.showPanel("profiles");
    WebInspector.panels.profiles.showProfileForURL(url);
}

WebInspector.linkifyURLAsNode = function(url, linkText, classes, isExternal, tooltipText)
{
    if (!linkText)
        linkText = url;
    classes = (classes ? classes + " " : "");
    classes += isExternal ? "webkit-html-external-link" : "webkit-html-resource-link";

    var a = document.createElement("a");
    a.href = url;
    a.className = classes;
    if (typeof tooltipText === "undefined")
        a.title = url;
    else if (typeof tooltipText !== "string" || tooltipText.length)
        a.title = tooltipText;
    a.textContent = linkText;
    a.style.maxWidth = "100%";
    if (isExternal)
        a.setAttribute("target", "_blank");

    return a;
}

WebInspector.linkifyURL = function(url, linkText, classes, isExternal, tooltipText)
{
    // Use the DOM version of this function so as to avoid needing to escape attributes.
    // FIXME:  Get rid of linkifyURL entirely.
    return WebInspector.linkifyURLAsNode(url, linkText, classes, isExternal, tooltipText).outerHTML;
}

WebInspector.formatLinkText = function(url, lineNumber)
{
    var text = WebInspector.displayNameForURL(url);
    if (lineNumber !== undefined)
        text += ":" + (lineNumber + 1);
    return text;
}

WebInspector.linkifyResourceAsNode = function(url, lineNumber, classes, tooltipText)
{
    var linkText = this.formatLinkText(url, lineNumber);
    var anchor = this.linkifyURLAsNode(url, linkText, classes, false, tooltipText);
    anchor.setAttribute("preferred_panel", "resources");
    anchor.setAttribute("line_number", lineNumber);
    return anchor;
}

WebInspector.resourceURLForRelatedNode = function(node, url)
{
    if (!url || url.indexOf("://") > 0)
        return url;

    for (var frameOwnerCandidate = node; frameOwnerCandidate; frameOwnerCandidate = frameOwnerCandidate.parentNode) {
        if (frameOwnerCandidate.documentURL) {
            var result = WebInspector.completeURL(frameOwnerCandidate.documentURL, url);
            if (result)
                return result;
            break;
        }
    }

    // documentURL not found or has bad value
    var resourceURL = url;
    function callback(resource)
    {
        if (resource.path === url) {
            resourceURL = resource.url;
            return true;
        }
    }
    WebInspector.forAllResources(callback);
    return resourceURL;
}

WebInspector.populateHrefContextMenu = function(contextMenu, contextNode, event)
{
    var anchorElement = event.target.enclosingNodeOrSelfWithClass("webkit-html-resource-link") || event.target.enclosingNodeOrSelfWithClass("webkit-html-external-link");
    if (!anchorElement)
        return false;

    var resourceURL = WebInspector.resourceURLForRelatedNode(contextNode, anchorElement.href);
    if (!resourceURL)
        return false;

    // Add resource-related actions.
    contextMenu.appendItem(WebInspector.openLinkExternallyLabel(), WebInspector.openResource.bind(WebInspector, resourceURL, false));
    if (WebInspector.resourceForURL(resourceURL))
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Open link in Resources panel" : "Open Link in Resources Panel"), WebInspector.openResource.bind(null, resourceURL, true));
    contextMenu.appendItem(WebInspector.copyLinkAddressLabel(), InspectorFrontendHost.copyText.bind(InspectorFrontendHost, resourceURL));
    return true;
}

WebInspector.completeURL = function(baseURL, href)
{
    if (href) {
        // Return absolute URLs as-is.
        var parsedHref = href.asParsedURL();
        if ((parsedHref && parsedHref.scheme) || href.indexOf("data:") === 0)
            return href;
    }

    var parsedURL = baseURL.asParsedURL();
    if (parsedURL) {
        var path = href;
        if (path.charAt(0) !== "/") {
            var basePath = parsedURL.path;
            // A href of "?foo=bar" implies "basePath?foo=bar".
            // With "basePath?a=b" and "?foo=bar" we should get "basePath?foo=bar".
            var prefix;
            if (path.charAt(0) === "?") {
                var basePathCutIndex = basePath.indexOf("?");
                if (basePathCutIndex !== -1)
                    prefix = basePath.substring(0, basePathCutIndex);
                else
                    prefix = basePath;
            } else
                prefix = basePath.substring(0, basePath.lastIndexOf("/")) + "/";

            path = prefix + path;
        } else if (path.length > 1 && path.charAt(1) === "/") {
            // href starts with "//" which is a full URL with the protocol dropped (use the baseURL protocol).
            return parsedURL.scheme + ":" + path;
        }
        return parsedURL.scheme + "://" + parsedURL.host + (parsedURL.port ? (":" + parsedURL.port) : "") + path;
    }
    return null;
}

WebInspector.addMainEventListeners = function(doc)
{
    doc.addEventListener("focus", this.focusChanged.bind(this), true);
    doc.addEventListener("keydown", this.documentKeyDown.bind(this), false);
    doc.addEventListener("beforecopy", this.documentCanCopy.bind(this), true);
    doc.addEventListener("copy", this.documentCopy.bind(this), true);
    doc.addEventListener("contextmenu", this.contextMenuEventFired.bind(this), true);

    doc.defaultView.addEventListener("focus", this.windowFocused.bind(this), false);
    doc.defaultView.addEventListener("blur", this.windowBlurred.bind(this), false);
    doc.addEventListener("click", this.documentClick.bind(this), true);
}

WebInspector.frontendReused = function()
{
    this.resourceTreeModel.frontendReused();
    this.reset();
}

WebInspector.UIString = function(string)
{
    return string;
}

WebInspector.useLowerCaseMenuTitles = function()
{
    return WebInspector.platform === "windows" && Preferences.useLowerCaseMenuTitlesOnWindows;
}

WebInspector._toolbarItemClicked = function(event)
{
    var toolbarItem = event.currentTarget;
    this.setCurrentPanel(toolbarItem.panel);
}

WebInspector.PanelHistory = function()
{
    this._history = [];
    this._historyIterator = -1;
}

WebInspector.PanelHistory.prototype = {
    canGoBack: function()
    {
        return this._historyIterator > 0;
    },

    goBack: function()
    {
        this._inHistory = true;
        WebInspector.setCurrentPanel(WebInspector.panels[this._history[--this._historyIterator]]);
        delete this._inHistory;
    },

    canGoForward: function()
    {
        return this._historyIterator < this._history.length - 1;
    },

    goForward: function()
    {
        this._inHistory = true;
        WebInspector.setCurrentPanel(WebInspector.panels[this._history[++this._historyIterator]]);
        delete this._inHistory;
    },

    setPanel: function(panelName)
    {
        if (this._inHistory)
            return;

        this._history.splice(this._historyIterator + 1, this._history.length - this._historyIterator - 1);
        if (!this._history.length || this._history[this._history.length - 1] !== panelName)
            this._history.push(panelName);
        this._historyIterator = this._history.length - 1;
    }
}

WebInspector.installSourceMappingForTest = function(url)
{
    // FIXME: remove this method when it's possible to set compiler source mappings via UI.
    var provider = new WebInspector.CompilerSourceMappingProvider(url);
    var uiSourceCode = WebInspector.panels.scripts.visibleView._delegate._uiSourceCode;
    uiSourceCode.rawSourceCode.setCompilerSourceMappingProvider(provider);
}




function setupPrototypeUtilities() {

Function.prototype.bind = function(thisObject)
{
    var func = this;
    var args = Array.prototype.slice.call(arguments, 1);
    function bound()
    {
        return func.apply(thisObject, args.concat(Array.prototype.slice.call(arguments, 0)));
    }
    bound.toString = function() {
        return "bound: " + func;
    };
    return bound;
}

/**
 * @param {string=} direction
 */
Node.prototype.rangeOfWord = function(offset, stopCharacters, stayWithinNode, direction)
{
    var startNode;
    var startOffset = 0;
    var endNode;
    var endOffset = 0;

    if (!stayWithinNode)
        stayWithinNode = this;

    if (!direction || direction === "backward" || direction === "both") {
        var node = this;
        while (node) {
            if (node === stayWithinNode) {
                if (!startNode)
                    startNode = stayWithinNode;
                break;
            }

            if (node.nodeType === Node.TEXT_NODE) {
                var start = (node === this ? (offset - 1) : (node.nodeValue.length - 1));
                for (var i = start; i >= 0; --i) {
                    if (stopCharacters.indexOf(node.nodeValue[i]) !== -1) {
                        startNode = node;
                        startOffset = i + 1;
                        break;
                    }
                }
            }

            if (startNode)
                break;

            node = node.traversePreviousNode(stayWithinNode);
        }

        if (!startNode) {
            startNode = stayWithinNode;
            startOffset = 0;
        }
    } else {
        startNode = this;
        startOffset = offset;
    }

    if (!direction || direction === "forward" || direction === "both") {
        node = this;
        while (node) {
            if (node === stayWithinNode) {
                if (!endNode)
                    endNode = stayWithinNode;
                break;
            }

            if (node.nodeType === Node.TEXT_NODE) {
                var start = (node === this ? offset : 0);
                for (var i = start; i < node.nodeValue.length; ++i) {
                    if (stopCharacters.indexOf(node.nodeValue[i]) !== -1) {
                        endNode = node;
                        endOffset = i;
                        break;
                    }
                }
            }

            if (endNode)
                break;

            node = node.traverseNextNode(stayWithinNode);
        }

        if (!endNode) {
            endNode = stayWithinNode;
            endOffset = stayWithinNode.nodeType === Node.TEXT_NODE ? stayWithinNode.nodeValue.length : stayWithinNode.childNodes.length;
        }
    } else {
        endNode = this;
        endOffset = offset;
    }

    var result = this.ownerDocument.createRange();
    result.setStart(startNode, startOffset);
    result.setEnd(endNode, endOffset);

    return result;
}

Node.prototype.traverseNextTextNode = function(stayWithin)
{
    var node = this.traverseNextNode(stayWithin);
    if (!node)
        return;

    while (node && node.nodeType !== Node.TEXT_NODE)
        node = node.traverseNextNode(stayWithin);

    return node;
}

Node.prototype.rangeBoundaryForOffset = function(offset)
{
    var node = this.traverseNextTextNode(this);
    while (node && offset > node.nodeValue.length) {
        offset -= node.nodeValue.length;
        node = node.traverseNextTextNode(this);
    }
    if (!node)
        return { container: this, offset: 0 };
    return { container: node, offset: offset };
}

Element.prototype.removeStyleClass = function(className)
{
    this.classList.remove(className);
}

Element.prototype.removeMatchingStyleClasses = function(classNameRegex)
{
    var regex = new RegExp("(^|\\s+)" + classNameRegex + "($|\\s+)");
    if (regex.test(this.className))
        this.className = this.className.replace(regex, " ");
}

Element.prototype.addStyleClass = function(className)
{
    this.classList.add(className);
}

Element.prototype.hasStyleClass = function(className)
{
    return this.classList.contains(className);
}

Element.prototype.positionAt = function(x, y)
{
    this.style.left = x + "px";
    this.style.top = y + "px";
}

Element.prototype.pruneEmptyTextNodes = function()
{
    var sibling = this.firstChild;
    while (sibling) {
        var nextSibling = sibling.nextSibling;
        if (sibling.nodeType === this.TEXT_NODE && sibling.nodeValue === "")
            this.removeChild(sibling);
        sibling = nextSibling;
    }
}

Element.prototype.isScrolledToBottom = function()
{
    // This code works only for 0-width border
    return this.scrollTop + this.clientHeight === this.scrollHeight;
}

Node.prototype.enclosingNodeOrSelfWithNodeNameInArray = function(nameArray)
{
    for (var node = this; node && node !== this.ownerDocument; node = node.parentNode)
        for (var i = 0; i < nameArray.length; ++i)
            if (node.nodeName.toLowerCase() === nameArray[i].toLowerCase())
                return node;
    return null;
}

Node.prototype.enclosingNodeOrSelfWithNodeName = function(nodeName)
{
    return this.enclosingNodeOrSelfWithNodeNameInArray([nodeName]);
}

Node.prototype.enclosingNodeOrSelfWithClass = function(className)
{
    for (var node = this; node && node !== this.ownerDocument; node = node.parentNode)
        if (node.nodeType === Node.ELEMENT_NODE && node.hasStyleClass(className))
            return node;
    return null;
}

Node.prototype.enclosingNodeWithClass = function(className)
{
    if (!this.parentNode)
        return null;
    return this.parentNode.enclosingNodeOrSelfWithClass(className);
}

Element.prototype.query = function(query)
{
    return this.ownerDocument.evaluate(query, this, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

Element.prototype.removeChildren = function()
{
    if (this.firstChild)
        this.textContent = "";
}

Element.prototype.isInsertionCaretInside = function()
{
    var selection = window.getSelection();
    if (!selection.rangeCount || !selection.isCollapsed)
        return false;
    var selectionRange = selection.getRangeAt(0);
    return selectionRange.startContainer === this || selectionRange.startContainer.isDescendant(this);
}

/**
 * @param {string=} className
 */
Element.prototype.createChild = function(elementName, className)
{
    var element = this.ownerDocument.createElement(elementName);
    if (className)
        element.className = className;
    this.appendChild(element);
    return element;
}

DocumentFragment.prototype.createChild = Element.prototype.createChild;

Element.prototype.totalOffsetLeft = function()
{
    var total = 0;
    for (var element = this; element; element = element.offsetParent)
        total += element.offsetLeft + (this !== element ? element.clientLeft : 0);
    return total;
}

Element.prototype.totalOffsetTop = function()
{
    var total = 0;
    for (var element = this; element; element = element.offsetParent)
        total += element.offsetTop + (this !== element ? element.clientTop : 0);
    return total;
}

Element.prototype.offsetRelativeToWindow = function(targetWindow)
{
    var elementOffset = {x: 0, y: 0};
    var curElement = this;
    var curWindow = this.ownerDocument.defaultView;
    while (curWindow && curElement) {
        elementOffset.x += curElement.totalOffsetLeft();
        elementOffset.y += curElement.totalOffsetTop();
        if (curWindow === targetWindow)
            break;

        curElement = curWindow.frameElement;
        curWindow = curWindow.parent;
    }

    return elementOffset;
}

Element.prototype.setTextAndTitle = function(text)
{
    this.textContent = text;
    this.title = text;
}

KeyboardEvent.prototype.__defineGetter__("data", function()
{
    // Emulate "data" attribute from DOM 3 TextInput event.
    // See http://www.w3.org/TR/DOM-Level-3-Events/#events-Events-TextEvent-data
    switch (this.type) {
        case "keypress":
            if (!this.ctrlKey && !this.metaKey)
                return String.fromCharCode(this.charCode);
            else
                return "";
        case "keydown":
        case "keyup":
            if (!this.ctrlKey && !this.metaKey && !this.altKey)
                return String.fromCharCode(this.which);
            else
                return "";
    }
});

Text.prototype.select = function(start, end)
{
    start = start || 0;
    end = end || this.textContent.length;

    if (start < 0)
        start = end + start;

    var selection = this.ownerDocument.defaultView.getSelection();
    selection.removeAllRanges();
    var range = this.ownerDocument.createRange();
    range.setStart(this, start);
    range.setEnd(this, end);
    selection.addRange(range);
    return this;
}

Element.prototype.__defineGetter__("selectionLeftOffset", function() {
    // Calculate selection offset relative to the current element.

    var selection = window.getSelection();
    if (!selection.containsNode(this, true))
        return null;

    var leftOffset = selection.anchorOffset;
    var node = selection.anchorNode;

    while (node !== this) {
        while (node.previousSibling) {
            node = node.previousSibling;
            leftOffset += node.textContent.length;
        }
        node = node.parentNode;
    }

    return leftOffset;
});

String.prototype.hasSubstring = function(string, caseInsensitive)
{
    if (!caseInsensitive)
        return this.indexOf(string) !== -1;
    return this.match(new RegExp(string.escapeForRegExp(), "i"));
}

String.prototype.findAll = function(string)
{
    var matches = [];
    var i = this.indexOf(string);
    while (i !== -1) {
        matches.push(i);
        i = this.indexOf(string, i + string.length);
    }
    return matches;
}

String.prototype.lineEndings = function()
{
    if (!this._lineEndings) {
        this._lineEndings = this.findAll("\n");
        this._lineEndings.push(this.length);
    }
    return this._lineEndings;
}

String.prototype.asParsedURL = function()
{
    // RegExp groups:
    // 1 - scheme
    // 2 - hostname
    // 3 - ?port
    // 4 - ?path
    // 5 - ?fragment
    var match = this.match(/^([^:]+):\/\/([^\/:]*)(?::([\d]+))?(?:(\/[^#]*)(?:#(.*))?)?$/i);
    if (!match)
        return null;
    var result = {};
    result.scheme = match[1].toLowerCase();
    result.host = match[2];
    result.port = match[3];
    result.path = match[4] || "/";
    result.fragment = match[5];
    return result;
}

String.prototype.escapeCharacters = function(chars)
{
    var foundChar = false;
    for (var i = 0; i < chars.length; ++i) {
        if (this.indexOf(chars.charAt(i)) !== -1) {
            foundChar = true;
            break;
        }
    }

    if (!foundChar)
        return this;

    var result = "";
    for (var i = 0; i < this.length; ++i) {
        if (chars.indexOf(this.charAt(i)) !== -1)
            result += "\\";
        result += this.charAt(i);
    }

    return result;
}

String.prototype.escapeForRegExp = function()
{
    return this.escapeCharacters("^[]{}()\\.$*+?|");
}

String.prototype.escapeHTML = function()
{
    return this.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); //" doublequotes just for editor
}

String.prototype.collapseWhitespace = function()
{
    return this.replace(/[\s\xA0]+/g, " ");
}

String.prototype.trimMiddle = function(maxLength)
{
    if (this.length <= maxLength)
        return this;
    var leftHalf = maxLength >> 1;
    var rightHalf = maxLength - leftHalf - 1;
    return this.substr(0, leftHalf) + "\u2026" + this.substr(this.length - rightHalf, rightHalf);
}

String.prototype.trimURL = function(baseURLDomain)
{
    var result = this.replace(/^(https|http|file):\/\//i, "");
    if (baseURLDomain)
        result = result.replace(new RegExp("^" + baseURLDomain.escapeForRegExp(), "i"), "");
    return result;
}

String.prototype.removeURLFragment = function()
{
    var fragmentIndex = this.indexOf("#");
    if (fragmentIndex == -1)
        fragmentIndex = this.length;
    return this.substring(0, fragmentIndex);
}

Node.prototype.isAncestor = function(node)
{
    if (!node)
        return false;

    var currentNode = node.parentNode;
    while (currentNode) {
        if (this === currentNode)
            return true;
        currentNode = currentNode.parentNode;
    }
    return false;
}

Node.prototype.isDescendant = function(descendant)
{
    return !!descendant && descendant.isAncestor(this);
}

Node.prototype.traverseNextNode = function(stayWithin)
{
    var node = this.firstChild;
    if (node)
        return node;

    if (stayWithin && this === stayWithin)
        return null;

    node = this.nextSibling;
    if (node)
        return node;

    node = this;
    while (node && !node.nextSibling && (!stayWithin || !node.parentNode || node.parentNode !== stayWithin))
        node = node.parentNode;
    if (!node)
        return null;

    return node.nextSibling;
}

Node.prototype.traversePreviousNode = function(stayWithin)
{
    if (stayWithin && this === stayWithin)
        return null;
    var node = this.previousSibling;
    while (node && node.lastChild)
        node = node.lastChild;
    if (node)
        return node;
    return this.parentNode;
}

Number.constrain = function(num, min, max)
{
    if (num < min)
        num = min;
    else if (num > max)
        num = max;
    return num;
}

Date.prototype.toISO8601Compact = function()
{
    function leadZero(x)
    {
        return x > 9 ? '' + x : '0' + x
    }
    return this.getFullYear() +
           leadZero(this.getMonth() + 1) +
           leadZero(this.getDate()) + 'T' +
           leadZero(this.getHours()) +
           leadZero(this.getMinutes()) +
           leadZero(this.getSeconds());
}

HTMLTextAreaElement.prototype.moveCursorToEnd = function()
{
    var length = this.value.length;
    this.setSelectionRange(length, length);
}

Object.defineProperty(Array.prototype, "remove",
{
    /**
     * @this {Array.<*>}
     */
    value: function(value, onlyFirst)
    {
        if (onlyFirst) {
            var index = this.indexOf(value);
            if (index !== -1)
                this.splice(index, 1);
            return;
        }

        var length = this.length;
        for (var i = 0; i < length; ++i) {
            if (this[i] === value)
                this.splice(i, 1);
        }
    }
});

Object.defineProperty(Array.prototype, "keySet",
{
    /**
     * @this {Array.<*>}
     */
    value: function()
    {
        var keys = {};
        for (var i = 0; i < this.length; ++i)
            keys[this[i]] = true;
        return keys;
    }
});

Object.defineProperty(Array.prototype, "upperBound",
{
    /**
     * @this {Array.<number>}
     */
    value: function(value)
    {
        var first = 0;
        var count = this.length;
        while (count > 0) {
          var step = count >> 1;
          var middle = first + step;
          if (value >= this[middle]) {
              first = middle + 1;
              count -= step + 1;
          } else
              count = step;
        }
        return first;
    }
});

Array.diff = function(left, right)
{
    var o = left;
    var n = right;

    var ns = {};
    var os = {};

    for (var i = 0; i < n.length; i++) {
        if (ns[n[i]] == null)
            ns[n[i]] = { rows: [], o: null };
        ns[n[i]].rows.push(i);
    }

    for (var i = 0; i < o.length; i++) {
        if (os[o[i]] == null)
            os[o[i]] = { rows: [], n: null };
        os[o[i]].rows.push(i);
    }

    for (var i in ns) {
        if (ns[i].rows.length == 1 && typeof(os[i]) != "undefined" && os[i].rows.length == 1) {
            n[ns[i].rows[0]] = { text: n[ns[i].rows[0]], row: os[i].rows[0] };
            o[os[i].rows[0]] = { text: o[os[i].rows[0]], row: ns[i].rows[0] };
        }
    }

    for (var i = 0; i < n.length - 1; i++) {
        if (n[i].text != null && n[i + 1].text == null && n[i].row + 1 < o.length && o[n[i].row + 1].text == null && n[i + 1] == o[n[i].row + 1]) {
            n[i + 1] = { text: n[i + 1], row: n[i].row + 1 };
            o[n[i].row + 1] = { text: o[n[i].row + 1], row: i + 1 };
        }
    }

    for (var i = n.length - 1; i > 0; i--) {
        if (n[i].text != null && n[i - 1].text == null && n[i].row > 0 && o[n[i].row - 1].text == null &&
            n[i - 1] == o[n[i].row - 1]) {
            n[i - 1] = { text: n[i - 1], row: n[i].row - 1 };
            o[n[i].row - 1] = { text: o[n[i].row - 1], row: i - 1 };
        }
    }

    return { left: o, right: n };
}

Array.convert = function(list)
{
    // Cast array-like object to an array.
    return Array.prototype.slice.call(list);
}

/**
 * @param {string} format
 * @param {...*} var_arg
 */
String.sprintf = function(format, var_arg)
{
    return String.vsprintf(format, Array.prototype.slice.call(arguments, 1));
}

String.tokenizeFormatString = function(format)
{
    var tokens = [];
    var substitutionIndex = 0;

    function addStringToken(str)
    {
        tokens.push({ type: "string", value: str });
    }

    function addSpecifierToken(specifier, precision, substitutionIndex)
    {
        tokens.push({ type: "specifier", specifier: specifier, precision: precision, substitutionIndex: substitutionIndex });
    }

    var index = 0;
    for (var precentIndex = format.indexOf("%", index); precentIndex !== -1; precentIndex = format.indexOf("%", index)) {
        addStringToken(format.substring(index, precentIndex));
        index = precentIndex + 1;

        if (format[index] === "%") {
            addStringToken("%");
            ++index;
            continue;
        }

        if (!isNaN(format[index])) {
            // The first character is a number, it might be a substitution index.
            var number = parseInt(format.substring(index), 10);
            while (!isNaN(format[index]))
                ++index;
            // If the number is greater than zero and ends with a "$",
            // then this is a substitution index.
            if (number > 0 && format[index] === "$") {
                substitutionIndex = (number - 1);
                ++index;
            }
        }

        var precision = -1;
        if (format[index] === ".") {
            // This is a precision specifier. If no digit follows the ".",
            // then the precision should be zero.
            ++index;
            precision = parseInt(format.substring(index), 10);
            if (isNaN(precision))
                precision = 0;
            while (!isNaN(format[index]))
                ++index;
        }

        addSpecifierToken(format[index], precision, substitutionIndex);

        ++substitutionIndex;
        ++index;
    }

    addStringToken(format.substring(index));

    return tokens;
}

String.standardFormatters = {
    d: function(substitution)
    {
        return !isNaN(substitution) ? substitution : 0;
    },

    f: function(substitution, token)
    {
        if (substitution && token.precision > -1)
            substitution = substitution.toFixed(token.precision);
        return !isNaN(substitution) ? substitution : (token.precision > -1 ? Number(0).toFixed(token.precision) : 0);
    },

    s: function(substitution)
    {
        return substitution;
    }
}

String.vsprintf = function(format, substitutions)
{
    return String.format(format, substitutions, String.standardFormatters, "", function(a, b) { return a + b; }).formattedResult;
}

String.format = function(format, substitutions, formatters, initialValue, append)
{
    if (!format || !substitutions || !substitutions.length)
        return { formattedResult: append(initialValue, format), unusedSubstitutions: substitutions };

    function prettyFunctionName()
    {
        return "String.format(\"" + format + "\", \"" + substitutions.join("\", \"") + "\")";
    }

    function warn(msg)
    {
        console.warn(prettyFunctionName() + ": " + msg);
    }

    function error(msg)
    {
        console.error(prettyFunctionName() + ": " + msg);
    }

    var result = initialValue;
    var tokens = String.tokenizeFormatString(format);
    var usedSubstitutionIndexes = {};

    for (var i = 0; i < tokens.length; ++i) {
        var token = tokens[i];

        if (token.type === "string") {
            result = append(result, token.value);
            continue;
        }

        if (token.type !== "specifier") {
            error("Unknown token type \"" + token.type + "\" found.");
            continue;
        }

        if (token.substitutionIndex >= substitutions.length) {
            // If there are not enough substitutions for the current substitutionIndex
            // just output the format specifier literally and move on.
            error("not enough substitution arguments. Had " + substitutions.length + " but needed " + (token.substitutionIndex + 1) + ", so substitution was skipped.");
            result = append(result, "%" + (token.precision > -1 ? token.precision : "") + token.specifier);
            continue;
        }

        usedSubstitutionIndexes[token.substitutionIndex] = true;

        if (!(token.specifier in formatters)) {
            // Encountered an unsupported format character, treat as a string.
            warn("unsupported format character \u201C" + token.specifier + "\u201D. Treating as a string.");
            result = append(result, substitutions[token.substitutionIndex]);
            continue;
        }

        result = append(result, formatters[token.specifier](substitutions[token.substitutionIndex], token));
    }

    var unusedSubstitutions = [];
    for (var i = 0; i < substitutions.length; ++i) {
        if (i in usedSubstitutionIndexes)
            continue;
        unusedSubstitutions.push(substitutions[i]);
    }

    return { formattedResult: result, unusedSubstitutions: unusedSubstitutions };
}

} // setupPrototypeUtilities()

setupPrototypeUtilities();

function isEnterKey(event) {
    // Check if in IME.
    return event.keyCode !== 229 && event.keyIdentifier === "Enter";
}

/**
 * @param {Element} element
 * @param {number} offset
 * @param {number} length
 * @param {Array.<Object>=} domChanges
 */
function highlightSearchResult(element, offset, length, domChanges)
{
    var result = highlightSearchResults(element, [{offset: offset, length: length }], domChanges);
    return result.length ? result[0] : null;
}

/**
 * @param {Element} element
 * @param {Array.<Object>} resultRanges
 * @param {Array.<Object>=} changes
 */
function highlightSearchResults(element, resultRanges, changes)
{
    return highlightRangesWithStyleClass(element, resultRanges, "webkit-search-result", changes);

}

/**
 * @param {Element} element
 * @param {Array.<Object>} resultRanges
 * @param {string} styleClass
 * @param {Array.<Object>=} changes
 */
function highlightRangesWithStyleClass(element, resultRanges, styleClass, changes)
{
    changes = changes || [];
    var highlightNodes = [];
    var lineText = element.textContent;
    var ownerDocument = element.ownerDocument;
    var textNodeSnapshot = ownerDocument.evaluate(".//text()", element, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    var snapshotLength = textNodeSnapshot.snapshotLength;
    if (snapshotLength === 0)
        return highlightNodes;

    var nodeRanges = [];
    var rangeEndOffset = 0;
    for (var i = 0; i < snapshotLength; ++i) {
        var range = {};
        range.offset = rangeEndOffset;
        range.length = textNodeSnapshot.snapshotItem(i).textContent.length;
        rangeEndOffset = range.offset + range.length;
        nodeRanges.push(range);
    }

    var startIndex = 0;
    for (var i = 0; i < resultRanges.length; ++i) {
        var startOffset = resultRanges[i].offset;
        var endOffset = startOffset + resultRanges[i].length;

        while (startIndex < snapshotLength && nodeRanges[startIndex].offset + nodeRanges[startIndex].length <= startOffset)
            startIndex++;
        var endIndex = startIndex;
        while (endIndex < snapshotLength && nodeRanges[endIndex].offset + nodeRanges[endIndex].length < endOffset)
            endIndex++;
        if (endIndex === snapshotLength)
            break;

        var highlightNode = ownerDocument.createElement("span");
        highlightNode.className = styleClass;
        highlightNode.textContent = lineText.substring(startOffset, endOffset);

        var lastTextNode = textNodeSnapshot.snapshotItem(endIndex);
        var lastText = lastTextNode.textContent;
        lastTextNode.textContent = lastText.substring(endOffset - nodeRanges[endIndex].offset);
        changes.push({ node: lastTextNode, type: "changed", oldText: lastText, newText: lastTextNode.textContent });

        if (startIndex === endIndex) {
            lastTextNode.parentElement.insertBefore(highlightNode, lastTextNode);
            changes.push({ node: highlightNode, type: "added", nextSibling: lastTextNode, parent: lastTextNode.parentElement });
            highlightNodes.push(highlightNode);

            var prefixNode = ownerDocument.createTextNode(lastText.substring(0, startOffset - nodeRanges[startIndex].offset));
            lastTextNode.parentElement.insertBefore(prefixNode, highlightNode);
            changes.push({ node: prefixNode, type: "added", nextSibling: highlightNode, parent: lastTextNode.parentElement });
        } else {
            var firstTextNode = textNodeSnapshot.snapshotItem(startIndex);
            var firstText = firstTextNode.textContent;
            var anchorElement = firstTextNode.nextSibling;

            firstTextNode.parentElement.insertBefore(highlightNode, anchorElement);
            changes.push({ node: highlightNode, type: "added", nextSibling: anchorElement, parent: firstTextNode.parentElement });
            highlightNodes.push(highlightNode);

            firstTextNode.textContent = firstText.substring(0, startOffset - nodeRanges[startIndex].offset);
            changes.push({ node: firstTextNode, type: "changed", oldText: firstText, newText: firstTextNode.textContent });

            for (var j = startIndex + 1; j < endIndex; j++) {
                var textNode = textNodeSnapshot.snapshotItem(j);
                var text = textNode.textContent;
                textNode.textContent = "";
                changes.push({ node: textNode, type: "changed", oldText: text, newText: textNode.textContent });
            }
        }
        startIndex = endIndex;
        nodeRanges[startIndex].offset = endOffset;
        nodeRanges[startIndex].length = lastTextNode.textContent.length;

    }
    return highlightNodes;
}

function applyDomChanges(domChanges)
{
    for (var i = 0, size = domChanges.length; i < size; ++i) {
        var entry = domChanges[i];
        switch (entry.type) {
        case "added":
            entry.parent.insertBefore(entry.node, entry.nextSibling);
            break;
        case "changed":
            entry.node.textContent = entry.newText;
            break;
        }
    }
}

function revertDomChanges(domChanges)
{
    for (var i = domChanges.length - 1; i >= 0; --i) {
        var entry = domChanges[i];
        switch (entry.type) {
        case "added":
            if (entry.node.parentElement)
                entry.node.parentElement.removeChild(entry.node);
            break;
        case "changed":
            entry.node.textContent = entry.oldText;
            break;
        }
    }
}

/**
 * @param {string} query
 * @param {boolean} caseSensitive
 * @param {boolean} isRegex
 * @return {RegExp}
 */
function createSearchRegex(query, caseSensitive, isRegex)
{
    var regexFlags = caseSensitive ? "g" : "gi";
    var regexObject;

    if (isRegex) {
        try {
            regexObject = new RegExp(query, regexFlags);
        } catch (e) {
            // Silent catch.
        }
    }

    if (!regexObject)
        regexObject = createPlainTextSearchRegex(query, regexFlags);

    return regexObject;
}

/**
 * @param {string} query
 * @param {string=} flags
 * @return {RegExp}
 */
function createPlainTextSearchRegex(query, flags)
{
    // This should be kept the same as the one in ContentSearchUtils.cpp.
    var regexSpecialCharacters = "[](){}+-*.,?\\^$|";
    var regex = "";
    for (var i = 0; i < query.length; ++i) {
        var c = query.charAt(i);
        if (regexSpecialCharacters.indexOf(c) != -1)
            regex += "\\";
        regex += c;
    }
    return new RegExp(regex, flags || "");
}

/**
 * @param {RegExp} regex
 * @param {string} content
 * @return {number}
 */
function countRegexMatches(regex, content)
{
    var text = content;
    var result = 0;
    var match;
    while (text && (match = regex.exec(text))) {
        if (match[0].length > 0)
            ++result;
        text = text.substring(match.index + 1);
    }
    return result;
}

/**
 * @param {number} value
 * @param {number} symbolsCount
 * @return {string}
 */
function numberToStringWithSpacesPadding(value, symbolsCount)
{
    var numberString = value.toString();
    var paddingLength = Math.max(0, symbolsCount - numberString.length);
    var paddingString = Array(paddingLength + 1).join("\u00a0");
    return paddingString + numberString;
}

/**
 * @constructor
 */
function TextDiff()
{
    this.added = [];
    this.removed = [];
    this.changed = [];
}

/**
 * @param {string} baseContent
 * @param {string} newContent
 * @return {TextDiff}
 */
TextDiff.compute = function(baseContent, newContent)
{
    var oldLines = baseContent.split(/\r?\n/);
    var newLines = newContent.split(/\r?\n/);

    var diff = Array.diff(oldLines, newLines);

    var diffData = new TextDiff();

    var offset = 0;
    var right = diff.right;
    for (var i = 0; i < right.length; ++i) {
        if (typeof right[i] === "string") {
            if (right.length > i + 1 && right[i + 1].row === i + 1 - offset)
                diffData.changed.push(i);
            else {
                diffData.added.push(i);
                offset++;
            }
        } else
            offset = i - right[i].row;
    }
    return diffData;
}





/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

WebInspector.PlatformFlavor = {
    WindowsVista: "windows-vista",
    MacTiger: "mac-tiger",
    MacLeopard: "mac-leopard",
    MacSnowLeopard: "mac-snowleopard"
}

WebInspector.isMac = function()
{
    if (typeof WebInspector._isMac === "undefined")
        WebInspector._isMac = WebInspector.platform === "mac";

    return WebInspector._isMac;
}

if (!window.InspectorFrontendHost) {

/**
 * @constructor
 */
WebInspector.InspectorFrontendHostStub = function()
{
    this._attachedWindowHeight = 0;
}

WebInspector._platformFlavor = WebInspector.PlatformFlavor.MacLeopard;

WebInspector.InspectorFrontendHostStub.prototype = {
    platform: function()
    {
        var match = navigator.userAgent.match(/Windows NT/);
        if (match)
            return "windows";
        match = navigator.userAgent.match(/Mac OS X/);
        if (match)
            return "mac";
        return "linux";
    },

    port: function()
    {
        return "unknown";
    },

    bringToFront: function()
    {
        this._windowVisible = true;
    },

    closeWindow: function()
    {
        this._windowVisible = false;
    },

    disconnectFromBackend: function()
    {
        this._windowVisible = false;
    },

    attach: function()
    {
    },

    detach: function()
    {
    },

    search: function(sourceRow, query)
    {
    },

    setAttachedWindowHeight: function(height)
    {
    },

    moveWindowBy: function(x, y)
    {
    },

    setExtensionAPI: function(script)
    {
    },

    loaded: function()
    {
    },

    localizedStringsURL: function()
    {
        return undefined;
    },

    hiddenPanels: function()
    {
        return "";
    },

    inspectedURLChanged: function(url)
    {
    },

    copyText: function()
    {
    },

    saveAs: function(fileName, content)
    {
        var builder = new WebKitBlobBuilder();
        builder.append(content);
        var blob = builder.getBlob("application/octet-stream");

        var fr = new FileReader();
        fr.onload = function(e) {
            // Force download
            window.location = this.result;
        }
        fr.readAsDataURL(blob);
    },

    canAttachWindow: function()
    {
        return false;
    },

    sendMessageToBackend: function(message)
    {
    },

    recordActionTaken: function(actionCode)
    {
    },

    recordPanelShown: function(panelCode)
    {
    },

    recordSettingChanged: function(settingCode)
    {
    }
}

//var InspectorFrontendHost = new WebInspector.InspectorFrontendHostStub();

}



/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.Object}
 */
WebInspector.WorkerManager = function()
{
    this._workerIdToWindow = {};
   // InspectorBackend.registerWorkerDispatcher(new WebInspector.DedicatedWorkerMessageForwarder(this));
}

WebInspector.WorkerManager.isWorkerFrontend = function()
{
    return !!WebInspector.queryParamsObject["dedicatedWorkerId"] ||
           !!WebInspector.queryParamsObject["isSharedWorker"];
}

WebInspector.WorkerManager.loaded = function()
{
    var workerId = WebInspector.queryParamsObject["dedicatedWorkerId"];
    if (workerId)
        WebInspector.WorkerManager._initializeDedicatedWorkerFrontend(workerId);
    else
        WebInspector.workerManager = new WebInspector.WorkerManager();

    if (WebInspector.WorkerManager.isWorkerFrontend())
        WebInspector.WorkerManager._calculateWorkerInspectorTitle();
}

WebInspector.WorkerManager._initializeDedicatedWorkerFrontend = function(workerId)
{
    function receiveMessage(event)
    {
        var message = event.data;
        InspectorBackend.dispatch(message);
    }
    window.addEventListener("message", receiveMessage, true);


    InspectorBackend.sendMessageObjectToBackend = function(message)
    {
        window.opener.postMessage({workerId: workerId, command: "sendMessageToBackend", message: message}, "*");
    }

    InspectorFrontendHost.loaded = function()
    {
        window.opener.postMessage({workerId: workerId, command: "loaded"}, "*");
    }
}

WebInspector.WorkerManager._calculateWorkerInspectorTitle = function()
{
    var expression = "location.href";
    if (WebInspector.queryParamsObject["isSharedWorker"])
        expression += " + (this.name ? ' (' + this.name + ')' : '')";
    RuntimeAgent.evaluate.invoke({expression:expression, doNotPauseOnExceptions:true, returnByValue: true}, evalCallback.bind(this));
    function evalCallback(error, result, wasThrown)
    {
        if (error || wasThrown) {
            console.error(error);
            return;
        }
        InspectorFrontendHost.inspectedURLChanged(result.value);
    }
}

WebInspector.WorkerManager.Events = {
    WorkerAdded: "worker-added",
    WorkerRemoved: "worker-removed",
    WorkersCleared: "workers-cleared",
    WorkerInspectorClosed: "worker-inspector-closed"
}

WebInspector.WorkerManager.prototype = {
    _workerCreated: function(workerId, url, inspectorConnected)
     {
        if (inspectorConnected)
            this._openInspectorWindow(workerId);
        this.dispatchEventToListeners(WebInspector.WorkerManager.Events.WorkerAdded, {workerId: workerId, url: url, inspectorConnected: inspectorConnected});
     },

    _workerTerminated: function(workerId)
     {
        this.closeWorkerInspector(workerId);
        this.dispatchEventToListeners(WebInspector.WorkerManager.Events.WorkerRemoved, workerId);
     },

    _sendMessageToWorkerInspector: function(workerId, message)
    {
        var workerInspectorWindow = this._workerIdToWindow[workerId];
        if (workerInspectorWindow)
            workerInspectorWindow.postMessage(message, "*");
    },

    openWorkerInspector: function(workerId)
    {
        this._openInspectorWindow(workerId);
        WorkerAgent.connectToWorker(workerId);
    },

    _openInspectorWindow: function(workerId)
    {
        var url = window.location.href + "&dedicatedWorkerId=" + workerId;
        url = url.replace("docked=true&", "");
        // Set location=0 just to make sure the front-end will be opened in a separate window, not in new tab.
        var workerInspectorWindow = window.open(url, undefined, "location=0");
        this._workerIdToWindow[workerId] = workerInspectorWindow;
        workerInspectorWindow.addEventListener("beforeunload", this._workerInspectorClosing.bind(this, workerId), true);

        // Listen to beforeunload in detached state and to the InspectorClosing event in case of attached inspector.
        window.addEventListener("beforeunload", this._pageInspectorClosing.bind(this), true);
        WebInspector.notifications.addEventListener(WebInspector.Events.InspectorClosing, this._pageInspectorClosing, this);
    },

    closeWorkerInspector: function(workerId)
    {
        var workerInspectorWindow = this._workerIdToWindow[workerId];
        if (workerInspectorWindow)
            workerInspectorWindow.close();
    },

    reset: function()
    {
        for (var workerId in this._workerIdToWindow)
            this.closeWorkerInspector(workerId);
        this.dispatchEventToListeners(WebInspector.WorkerManager.Events.WorkersCleared);
    },

    _pageInspectorClosing: function()
    {
        this._ignoreWorkerInspectorClosing = true;
        for (var workerId in this._workerIdToWindow) {
            this._workerIdToWindow[workerId].close();
            WorkerAgent.disconnectFromWorker(parseInt(workerId, 10));
        }
    },

    _workerInspectorClosing: function(workerId, event)
    {
        if (this._ignoreWorkerInspectorClosing)
            return;
        delete this._workerIdToWindow[workerId];
        WorkerAgent.disconnectFromWorker(workerId);
        this.dispatchEventToListeners(WebInspector.WorkerManager.Events.WorkerInspectorClosed, workerId);
    }
}

WebInspector.WorkerManager.prototype.__proto__ = Object.prototype;

/**
 * @constructor
 * @implements {WorkerAgent.Dispatcher}
 */
WebInspector.DedicatedWorkerMessageForwarder = function(workerManager)
{
    this._workerManager = workerManager;
    window.addEventListener("message", this._receiveMessage.bind(this), true);
}

WebInspector.DedicatedWorkerMessageForwarder.prototype = {
    _receiveMessage: function(event)
    {
        var workerId = event.data["workerId"];
        workerId = parseInt(workerId, 10);
        var command = event.data.command;
        var message = event.data.message;

        if (command == "sendMessageToBackend")
            WorkerAgent.sendMessageToWorker(workerId, message);
    },

    workerCreated: function(workerId, url, inspectorConnected)
    {
        this._workerManager._workerCreated(workerId, url, inspectorConnected);
    },

    workerTerminated: function(workerId)
    {
        this._workerManager._workerTerminated(workerId);
    },

    dispatchMessageFromWorker: function(workerId, message)
    {
        this._workerManager._sendMessageToWorkerInspector(workerId, message);
    }
}


    function insertionIndexForObjectInListSortedByFunction(anObject, aList, aFunction)
    {
        var index = binarySearch(anObject, aList, aFunction);
        if (index < 0)

        return -index - 1;
    else {

        while (index > 0 && aFunction(anObject, aList[index - 1]) === 0)
            index--;
        return index;        
    }
}

function binarySearch(object, array, comparator)
    {
        var first = 0;
        var last = array.length - 1;

        while (first <= last) {
            var mid = (first + last) >> 1;
            var c = comparator(object, array[mid]);
            if (c > 0)
                first = mid + 1;
            else if (c < 0)
                last = mid - 1;
            else
                return mid;
        }


        return -(first + 1);
    }

    Object.defineProperty(Array.prototype, "binaryIndexOf", { value: function(value, comparator)
        {
            var result = binarySearch(value, this, comparator);
            return result >= 0 ? result : -1;
        }});

    function insertionIndexForObjectInListSortedByFunction(anObject, aList, aFunction)
    {
        var index = binarySearch(anObject, aList, aFunction);
        if (index < 0)

        return -index - 1;
    else {

        while (index > 0 && aFunction(anObject, aList[index - 1]) === 0)
            index--;
        return index;        
    }
}/*
 * Copyright (C) 2009 Apple Inc. All rights reserved.
 * Copyright (C) 2009 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 */
WebInspector.KeyboardShortcut = function()
{
}

/**
 * Constants for encoding modifier key set as a bit mask.
 * @see #_makeKeyFromCodeAndModifiers
 */
WebInspector.KeyboardShortcut.Modifiers = {
    None: 0,   // Constant for empty modifiers set.
    Shift: 1,
    Ctrl: 2,
    Alt: 4,
    Meta: 8,   // Command key on Mac, Win key on other platforms.
    get CtrlOrMeta()
    {
        // "default" command/ctrl key for platform, Command on Mac, Ctrl on other platforms
        return WebInspector.isMac() ? this.Meta : this.Ctrl;
    }
};

WebInspector.KeyboardShortcut.Keys = {
    Backspace: { code: 8, name: "\u21a4" },
    Tab: { code: 9, name: { mac: "\u21e5", other: "<Tab>" } },
    Enter: { code: 13, name: { mac: "\u21a9", other: "<Enter>" } },
    Esc: { code: 27, name: { mac: "\u238b", other: "<Esc>" } },
    Space: { code: 32, name: "<Space>" },
    PageUp: { code: 33,  name: { mac: "\u21de", other: "<PageUp>" } },      // also NUM_NORTH_EAST
    PageDown: { code: 34, name: { mac: "\u21df", other: "<PageDown>" } },   // also NUM_SOUTH_EAST
    End: { code: 35, name: { mac: "\u2197", other: "<End>" } },             // also NUM_SOUTH_WEST
    Home: { code: 36, name: { mac: "\u2196", other: "<Home>" } },           // also NUM_NORTH_WEST
    Left: { code: 37, name: "\u2190" },           // also NUM_WEST
    Up: { code: 38, name: "\u2191" },             // also NUM_NORTH
    Right: { code: 39, name: "\u2192" },          // also NUM_EAST
    Down: { code: 40, name: "\u2193" },           // also NUM_SOUTH
    Delete: { code: 46, name: "<Del>" },
    Zero: { code: 48, name: "0" },
    F1: { code: 112, name: "F1" },
    F2: { code: 113, name: "F2" },
    F3: { code: 114, name: "F3" },
    F4: { code: 115, name: "F4" },
    F5: { code: 116, name: "F5" },
    F6: { code: 117, name: "F6" },
    F7: { code: 118, name: "F7" },
    F8: { code: 119, name: "F8" },
    F9: { code: 120, name: "F9" },
    F10: { code: 121, name: "F10" },
    F11: { code: 122, name: "F11" },
    F12: { code: 123, name: "F12" },
    Semicolon: { code: 186, name: ";" },
    Plus: { code: 187, name: "+" },
    Comma: { code: 188, name: "," },
    Minus: { code: 189, name: "-" },
    Period: { code: 190, name: "." },
    Slash: { code: 191, name: "/" },
    Apostrophe: { code: 192, name: "`" },
    SingleQuote: { code: 222, name: "\'" }
};

/**
 * Creates a number encoding keyCode in the lower 8 bits and modifiers mask in the higher 8 bits.
 * It is useful for matching pressed keys.
 * keyCode is the Code of the key, or a character "a-z" which is converted to a keyCode value.
 * @param {number=} modifiers Optional list of modifiers passed as additional paramerters.
 */
WebInspector.KeyboardShortcut.makeKey = function(keyCode, modifiers)
{
    if (typeof keyCode === "string")
        keyCode = keyCode.charCodeAt(0) - 32;
    modifiers = modifiers || WebInspector.KeyboardShortcut.Modifiers.None;
    return WebInspector.KeyboardShortcut._makeKeyFromCodeAndModifiers(keyCode, modifiers);
}

WebInspector.KeyboardShortcut.makeKeyFromEvent = function(keyboardEvent)
{
    var modifiers = WebInspector.KeyboardShortcut.Modifiers.None;
    if (keyboardEvent.shiftKey)
        modifiers |= WebInspector.KeyboardShortcut.Modifiers.Shift;
    if (keyboardEvent.ctrlKey)
        modifiers |= WebInspector.KeyboardShortcut.Modifiers.Ctrl;
    if (keyboardEvent.altKey)
        modifiers |= WebInspector.KeyboardShortcut.Modifiers.Alt;
    if (keyboardEvent.metaKey)
        modifiers |= WebInspector.KeyboardShortcut.Modifiers.Meta;
    return WebInspector.KeyboardShortcut._makeKeyFromCodeAndModifiers(keyboardEvent.keyCode, modifiers);
}

/**
 * @param {number=} modifiers
 */
WebInspector.KeyboardShortcut.makeDescriptor = function(key, modifiers)
{
    return {
        key: WebInspector.KeyboardShortcut.makeKey(typeof key === "string" ? key : key.code, modifiers),
        name: WebInspector.KeyboardShortcut.shortcutToString(key, modifiers)
    };
}

/**
 * @param {number=} modifiers
 */
WebInspector.KeyboardShortcut.shortcutToString = function(key, modifiers)
{
    return WebInspector.KeyboardShortcut._modifiersToString(modifiers) + WebInspector.KeyboardShortcut._keyName(key);
}

WebInspector.KeyboardShortcut._keyName = function(key)
{
    if (typeof key === "string")
        return key.toUpperCase();
    if (typeof key.name === "string")
        return key.name;
    return key.name[WebInspector.platform] || key.name.other;
}

WebInspector.KeyboardShortcut._makeKeyFromCodeAndModifiers = function(keyCode, modifiers)
{
    return (keyCode & 255) | (modifiers << 8);
};

WebInspector.KeyboardShortcut._modifiersToString = function(modifiers)
{
    const cmdKey = "\u2318";
    const optKey = "\u2325";
    const shiftKey = "\u21e7";
    const ctrlKey = "\u2303";

    var isMac = WebInspector.isMac();
    var res = "";
    if (modifiers & WebInspector.KeyboardShortcut.Modifiers.Ctrl)
        res += isMac ? ctrlKey : "<Ctrl> + ";
    if (modifiers & WebInspector.KeyboardShortcut.Modifiers.Alt)
        res += isMac ? optKey : "<Alt> + ";
    if (modifiers & WebInspector.KeyboardShortcut.Modifiers.Shift)
        res += isMac ? shiftKey : "<Shift> + ";
    if (modifiers & WebInspector.KeyboardShortcut.Modifiers.Meta)
        res += isMac ? cmdKey : "<Win> + ";

    return res;
};
/* Generated by re2c 0.13.5 on Tue Jan 26 01:16:33 2010 */
/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 */
WebInspector.SourceTokenizer = function()
{
}

WebInspector.SourceTokenizer.prototype = {
    set line(line) {
        this._line = line;
    },

    set condition(condition)
    {
        this._condition = condition;
    },

    get condition()
    {
        return this._condition;
    },

    getLexCondition: function()
    {
        return this.condition.lexCondition;
    },

    setLexCondition: function(lexCondition)
    {
        this.condition.lexCondition = lexCondition;
    },

    _charAt: function(cursor)
    {
        return cursor < this._line.length ? this._line.charAt(cursor) : "\n";
    },

    createInitialCondition: function()
    {
    },

    nextToken: function(cursor)
    {
    }
}

/**
 * @constructor
 */
WebInspector.SourceTokenizer.Registry = function() {
    this._tokenizers = {};
    this._tokenizerConstructors = {
        "text/css": "SourceCSSTokenizer",
        "text/html": "SourceHTMLTokenizer",
        "text/javascript": "SourceJavaScriptTokenizer"
    };
}

WebInspector.SourceTokenizer.Registry.getInstance = function()
{
    if (!WebInspector.SourceTokenizer.Registry._instance)
        WebInspector.SourceTokenizer.Registry._instance = new WebInspector.SourceTokenizer.Registry();
    return WebInspector.SourceTokenizer.Registry._instance;
}

WebInspector.SourceTokenizer.Registry.prototype = {
    getTokenizer: function(mimeType)
    {
        if (!this._tokenizerConstructors[mimeType])
            return null;
        var tokenizerClass = this._tokenizerConstructors[mimeType];
        var tokenizer = this._tokenizers[tokenizerClass];
        if (!tokenizer) {
            tokenizer = new WebInspector[tokenizerClass]();
            this._tokenizers[tokenizerClass] = tokenizer;
        }
        return tokenizer;
    }
}/* Generated by re2c 0.13.5 on Fri May  6 13:46:34 2011 */
/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// Generate js file as follows:
//
// re2c -isc WebCore/inspector/front-end/SourceCSSTokenizer.re2js \
// | sed 's|^yy\([^:]*\)*\:|case \1:|' \
// | sed 's|[*]cursor[+][+]|this._charAt(cursor++)|' \
// | sed 's|[[*][+][+]cursor|this._charAt(++cursor)|' \
// | sed 's|[*]cursor|this._charAt(cursor)|' \
// | sed 's|yych = \*\([^;]*\)|yych = this._charAt\1|' \
// | sed 's|{ gotoCase = \([^; continue; };]*\)|{ gotoCase = \1; continue; }|' \
// | sed 's|unsigned\ int|var|' \
// | sed 's|var\ yych|case 1: case 1: var yych|'

/**
 * @constructor
 * @extends {WebInspector.SourceTokenizer}
 */
WebInspector.SourceCSSTokenizer = function()
{
    WebInspector.SourceTokenizer.call(this);

    this._propertyKeywords = {}

    this._valueKeywords = [
        "above", "absolute", "activeborder", "activecaption", "afar", "after-white-space", "ahead", "alias", "all", "all-scroll",
        "alternate", "always","amharic", "amharic-abegede", "antialiased", "appworkspace", "aqua", "arabic-indic", "armenian", "asterisks",
        "auto", "avoid", "background", "backwards", "baseline", "below", "bidi-override", "binary", "bengali", "black", "blink",
        "block", "block-axis", "blue", "bold", "bolder", "border", "border-box", "both", "bottom", "break-all", "break-word", "button",
        "button-bevel", "buttonface", "buttonhighlight", "buttonshadow", "buttontext", "cambodian", "capitalize", "caps-lock-indicator",
        "caption", "captiontext", "caret", "cell", "center", "checkbox", "circle", "cjk-earthly-branch", "cjk-heavenly-stem", "cjk-ideographic",
        "clear", "clip", "close-quote", "col-resize", "collapse", "compact", "condensed", "contain", "content", "content-box", "context-menu",
        "continuous", "copy", "cover", "crop", "cross", "crosshair", "currentcolor", "cursive", "dashed", "decimal", "decimal-leading-zero", "default",
        "default-button", "destination-atop", "destination-in", "destination-out", "destination-over", "devanagari", "disc", "discard", "document",
        "dot-dash", "dot-dot-dash", "dotted", "double", "down", "e-resize", "ease", "ease-in", "ease-in-out", "ease-out", "element",
        "ellipsis", "embed", "end", "ethiopic", "ethiopic-abegede", "ethiopic-abegede-am-et", "ethiopic-abegede-gez",
        "ethiopic-abegede-ti-er", "ethiopic-abegede-ti-et", "ethiopic-halehame-aa-er", "ethiopic-halehame-aa-et",
        "ethiopic-halehame-am-et", "ethiopic-halehame-gez", "ethiopic-halehame-om-et", "ethiopic-halehame-sid-et",
        "ethiopic-halehame-so-et", "ethiopic-halehame-ti-er", "ethiopic-halehame-ti-et", "ethiopic-halehame-tig", "ew-resize", "expanded",
        "extra-condensed", "extra-expanded", "fantasy", "fast", "fill", "fixed", "flat", "footnotes", "forwards", "from", "fuchsia", "geometricPrecision",
        "georgian", "gray", "graytext", "green", "grey", "groove", "gujarati", "gurmukhi", "hand", "hangul", "hangul-consonant", "hebrew", "help",
        "hidden", "hide", "higher", "highlight", "highlighttext", "hiragana", "hiragana-iroha", "horizontal", "hsl", "hsla", "icon", "ignore",
        "inactiveborder", "inactivecaption", "inactivecaptiontext", "infinite", "infobackground", "infotext", "inherit", "initial", "inline",
        "inline-axis", "inline-block", "inline-table", "inset", "inside", "intrinsic", "invert", "italic", "justify", "kannada", "katakana",
        "katakana-iroha", "khmer", "landscape", "lao", "large", "larger", "left", "level", "lighter", "lime", "line-through", "linear", "lines",
        "list-button", "list-item", "listbox", "listitem", "local", "logical", "loud", "lower", "lower-alpha", "lower-armenian", "lower-greek",
        "lower-hexadecimal", "lower-latin", "lower-norwegian", "lower-roman", "lowercase", "ltr", "malayalam", "maroon", "match", "media-controls-background",
        "media-current-time-display", "media-fullscreen-button", "media-mute-button", "media-play-button", "media-return-to-realtime-button",
        "media-rewind-button", "media-seek-back-button", "media-seek-forward-button", "media-slider", "media-sliderthumb", "media-time-remaining-display",
        "media-volume-slider", "media-volume-slider-container", "media-volume-sliderthumb", "medium", "menu", "menulist", "menulist-button",
        "menulist-text", "menulist-textfield", "menutext", "message-box", "middle", "min-intrinsic", "mix", "mongolian", "monospace", "move", "multiple",
        "myanmar", "n-resize", "narrower", "navy", "ne-resize", "nesw-resize", "no-close-quote", "no-drop", "no-open-quote", "no-repeat", "none",
        "normal", "not-allowed", "nowrap", "ns-resize", "nw-resize", "nwse-resize", "oblique", "octal", "olive", "open-quote", "optimizeLegibility",
        "optimizeSpeed", "orange", "oriya", "oromo", "outset", "outside", "overlay", "overline", "padding", "padding-box", "painted", "paused",
        "persian", "plus-darker", "plus-lighter", "pointer", "portrait", "pre", "pre-line", "pre-wrap", "preserve-3d", "progress", "purple",
        "push-button", "radio", "read-only", "read-write", "read-write-plaintext-only", "red", "relative", "repeat", "repeat-x",
        "repeat-y", "reset", "reverse", "rgb", "rgba", "ridge", "right", "round", "row-resize", "rtl", "run-in", "running", "s-resize", "sans-serif",
        "scroll", "scrollbar", "se-resize", "searchfield", "searchfield-cancel-button", "searchfield-decoration", "searchfield-results-button",
        "searchfield-results-decoration", "semi-condensed", "semi-expanded", "separate", "serif", "show", "sidama", "silver", "single",
        "skip-white-space", "slide", "slider-horizontal", "slider-vertical", "sliderthumb-horizontal", "sliderthumb-vertical", "slow",
        "small", "small-caps", "small-caption", "smaller", "solid", "somali", "source-atop", "source-in", "source-out", "source-over",
        "space", "square", "square-button", "start", "static", "status-bar", "stretch", "stroke", "sub", "subpixel-antialiased", "super",
        "sw-resize", "table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group",
        "table-row", "table-row-group", "teal", "telugu", "text", "text-bottom", "text-top", "textarea", "textfield", "thai", "thick", "thin",
        "threeddarkshadow", "threedface", "threedhighlight", "threedlightshadow", "threedshadow", "tibetan", "tigre", "tigrinya-er", "tigrinya-er-abegede",
        "tigrinya-et", "tigrinya-et-abegede", "to", "top", "transparent", "ultra-condensed", "ultra-expanded", "underline", "up", "upper-alpha", "upper-armenian",
        "upper-greek", "upper-hexadecimal", "upper-latin", "upper-norwegian", "upper-roman", "uppercase", "urdu", "url", "vertical", "vertical-text", "visible",
        "visibleFill", "visiblePainted", "visibleStroke", "visual", "w-resize", "wait", "wave", "white", "wider", "window", "windowframe", "windowtext",
        "x-large", "x-small", "xor", "xx-large", "xx-small", "yellow", "-wap-marquee", "-webkit-activelink", "-webkit-auto", "-webkit-baseline-middle",
        "-webkit-body", "-webkit-box", "-webkit-center", "-webkit-control", "-webkit-focus-ring-color", "-webkit-grab", "-webkit-grabbing",
        "-webkit-gradient", "-webkit-inline-box", "-webkit-left", "-webkit-link", "-webkit-marquee", "-webkit-mini-control", "-webkit-nowrap", "-webkit-pictograph",
        "-webkit-right", "-webkit-small-control", "-webkit-text", "-webkit-xxx-large", "-webkit-zoom-in", "-webkit-zoom-out",
    ].keySet();

    this._mediaTypes = ["all", "aural", "braille", "embossed", "handheld", "import", "print", "projection", "screen", "tty", "tv"].keySet();

    this._lexConditions = {
        INITIAL: 0,
        COMMENT: 1,
        DSTRING: 2,
        SSTRING: 3
    };

    this._parseConditions = {
        INITIAL: 0,
        PROPERTY: 1,
        PROPERTY_VALUE: 2,
        AT_RULE: 3
    };

    this.case_INITIAL = 1000;
    this.case_COMMENT = 1002;
    this.case_DSTRING = 1003;
    this.case_SSTRING = 1004;

    this.condition = this.createInitialCondition();
}

WebInspector.SourceCSSTokenizer.prototype = {
    createInitialCondition: function()
    {
        return { lexCondition: this._lexConditions.INITIAL, parseCondition: this._parseConditions.INITIAL };
    },

    /**
     * @param {boolean=} stringEnds
     */
    _stringToken: function(cursor, stringEnds)
    {
        if (this._isPropertyValue())
            this.tokenType = "css-string";
        else
            this.tokenType = null;
        return cursor;
    },

    _isPropertyValue: function()
    {
        return this._condition.parseCondition === this._parseConditions.PROPERTY_VALUE || this._condition.parseCondition === this._parseConditions.AT_RULE;
    },

    nextToken: function(cursor)
    {
        var cursorOnEnter = cursor;
        var gotoCase = 1;
        var YYMARKER;
        while (1) {
            switch (gotoCase)
            // Following comment is replaced with generated state machine.

        {
            case 1: var yych;
            var yyaccept = 0;
            if (this.getLexCondition() < 2) {
                if (this.getLexCondition() < 1) {
                    { gotoCase = this.case_INITIAL; continue; };
                } else {
                    { gotoCase = this.case_COMMENT; continue; };
                }
            } else {
                if (this.getLexCondition() < 3) {
                    { gotoCase = this.case_DSTRING; continue; };
                } else {
                    { gotoCase = this.case_SSTRING; continue; };
                }
            }
/* *********************************** */
case this.case_COMMENT:

            yych = this._charAt(cursor);
            if (yych <= '\f') {
                if (yych == '\n') { gotoCase = 4; continue; };
                { gotoCase = 3; continue; };
            } else {
                if (yych <= '\r') { gotoCase = 4; continue; };
                if (yych == '*') { gotoCase = 6; continue; };
                { gotoCase = 3; continue; };
            }
case 2:
            { this.tokenType = "css-comment"; return cursor; }
case 3:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            { gotoCase = 12; continue; };
case 4:
            ++cursor;
            { this.tokenType = null; return cursor; }
case 6:
            yyaccept = 1;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych == '*') { gotoCase = 9; continue; };
            if (yych != '/') { gotoCase = 11; continue; };
case 7:
            ++cursor;
            this.setLexCondition(this._lexConditions.INITIAL);
            { this.tokenType = "css-comment"; return cursor; }
case 9:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych == '*') { gotoCase = 9; continue; };
            if (yych == '/') { gotoCase = 7; continue; };
case 11:
            yyaccept = 0;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
case 12:
            if (yych <= '\f') {
                if (yych == '\n') { gotoCase = 2; continue; };
                { gotoCase = 11; continue; };
            } else {
                if (yych <= '\r') { gotoCase = 2; continue; };
                if (yych == '*') { gotoCase = 9; continue; };
                { gotoCase = 11; continue; };
            }
/* *********************************** */
case this.case_DSTRING:
            yych = this._charAt(cursor);
            if (yych <= '\r') {
                if (yych == '\n') { gotoCase = 17; continue; };
                if (yych <= '\f') { gotoCase = 16; continue; };
                { gotoCase = 17; continue; };
            } else {
                if (yych <= '"') {
                    if (yych <= '!') { gotoCase = 16; continue; };
                    { gotoCase = 19; continue; };
                } else {
                    if (yych == '\\') { gotoCase = 21; continue; };
                    { gotoCase = 16; continue; };
                }
            }
case 15:
            { return this._stringToken(cursor); }
case 16:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            { gotoCase = 23; continue; };
case 17:
            ++cursor;
case 18:
            { this.tokenType = null; return cursor; }
case 19:
            ++cursor;
case 20:
            this.setLexCondition(this._lexConditions.INITIAL);
            { return this._stringToken(cursor, true); }
case 21:
            yych = this._charAt(++cursor);
            if (yych <= 'e') {
                if (yych <= '\'') {
                    if (yych == '"') { gotoCase = 22; continue; };
                    if (yych <= '&') { gotoCase = 18; continue; };
                } else {
                    if (yych <= '\\') {
                        if (yych <= '[') { gotoCase = 18; continue; };
                    } else {
                        if (yych != 'b') { gotoCase = 18; continue; };
                    }
                }
            } else {
                if (yych <= 'r') {
                    if (yych <= 'm') {
                        if (yych >= 'g') { gotoCase = 18; continue; };
                    } else {
                        if (yych <= 'n') { gotoCase = 22; continue; };
                        if (yych <= 'q') { gotoCase = 18; continue; };
                    }
                } else {
                    if (yych <= 't') {
                        if (yych <= 's') { gotoCase = 18; continue; };
                    } else {
                        if (yych != 'v') { gotoCase = 18; continue; };
                    }
                }
            }
case 22:
            yyaccept = 0;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
case 23:
            if (yych <= '\r') {
                if (yych == '\n') { gotoCase = 15; continue; };
                if (yych <= '\f') { gotoCase = 22; continue; };
                { gotoCase = 15; continue; };
            } else {
                if (yych <= '"') {
                    if (yych <= '!') { gotoCase = 22; continue; };
                    { gotoCase = 26; continue; };
                } else {
                    if (yych != '\\') { gotoCase = 22; continue; };
                }
            }
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= 'e') {
                if (yych <= '\'') {
                    if (yych == '"') { gotoCase = 22; continue; };
                    if (yych >= '\'') { gotoCase = 22; continue; };
                } else {
                    if (yych <= '\\') {
                        if (yych >= '\\') { gotoCase = 22; continue; };
                    } else {
                        if (yych == 'b') { gotoCase = 22; continue; };
                    }
                }
            } else {
                if (yych <= 'r') {
                    if (yych <= 'm') {
                        if (yych <= 'f') { gotoCase = 22; continue; };
                    } else {
                        if (yych <= 'n') { gotoCase = 22; continue; };
                        if (yych >= 'r') { gotoCase = 22; continue; };
                    }
                } else {
                    if (yych <= 't') {
                        if (yych >= 't') { gotoCase = 22; continue; };
                    } else {
                        if (yych == 'v') { gotoCase = 22; continue; };
                    }
                }
            }
            cursor = YYMARKER;
            { gotoCase = 15; continue; };
case 26:
            ++cursor;
            yych = this._charAt(cursor);
            { gotoCase = 20; continue; };
/* *********************************** */
case this.case_INITIAL:
            yych = this._charAt(cursor);
            if (yych <= ';') {
                if (yych <= '\'') {
                    if (yych <= '"') {
                        if (yych <= ' ') { gotoCase = 29; continue; };
                        if (yych <= '!') { gotoCase = 31; continue; };
                        { gotoCase = 33; continue; };
                    } else {
                        if (yych == '$') { gotoCase = 31; continue; };
                        if (yych >= '\'') { gotoCase = 34; continue; };
                    }
                } else {
                    if (yych <= '.') {
                        if (yych <= ',') { gotoCase = 29; continue; };
                        if (yych <= '-') { gotoCase = 35; continue; };
                        { gotoCase = 36; continue; };
                    } else {
                        if (yych <= '/') { gotoCase = 37; continue; };
                        if (yych <= '9') { gotoCase = 38; continue; };
                        if (yych <= ':') { gotoCase = 40; continue; };
                        { gotoCase = 42; continue; };
                    }
                }
            } else {
                if (yych <= '^') {
                    if (yych <= '?') {
                        if (yych == '=') { gotoCase = 31; continue; };
                    } else {
                        if (yych == '\\') { gotoCase = 29; continue; };
                        if (yych <= ']') { gotoCase = 31; continue; };
                    }
                } else {
                    if (yych <= 'z') {
                        if (yych != '`') { gotoCase = 31; continue; };
                    } else {
                        if (yych <= '{') { gotoCase = 44; continue; };
                        if (yych == '}') { gotoCase = 46; continue; };
                    }
                }
            }
case 29:
            ++cursor;
case 30:
            { this.tokenType = null; return cursor; }
case 31:
            ++cursor;
            yych = this._charAt(cursor);
            { gotoCase = 49; continue; };
case 32:
            {
                    var token = this._line.substring(cursorOnEnter, cursor);
                    if (this._condition.parseCondition === this._parseConditions.INITIAL) {
                        if (token === "@import" || token === "@media") {
                            this.tokenType = "css-at-rule";
                            this._condition.parseCondition = this._parseConditions.AT_RULE;
                        } else if (token.indexOf("@") === 0)
                            this.tokenType = "css-at-rule";
                        else
                            this.tokenType = "css-selector";
                    }
                    else if (this._condition.parseCondition === this._parseConditions.AT_RULE && token in this._mediaTypes)
                        this.tokenType = "css-keyword";
                    else if (this._condition.parseCondition === this._parseConditions.PROPERTY && token in this._propertyKeywords)
                        this.tokenType = "css-property";
                    else if (this._isPropertyValue() && token in this._valueKeywords)
                        this.tokenType = "css-keyword";
                    else if (token === "!important")
                        this.tokenType = "css-important";
                    else
                        this.tokenType = null;
                    return cursor;
                }
case 33:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych <= '-') {
                if (yych <= '!') {
                    if (yych <= '\f') {
                        if (yych == '\n') { gotoCase = 32; continue; };
                        { gotoCase = 124; continue; };
                    } else {
                        if (yych <= '\r') { gotoCase = 32; continue; };
                        if (yych <= ' ') { gotoCase = 124; continue; };
                        { gotoCase = 122; continue; };
                    }
                } else {
                    if (yych <= '$') {
                        if (yych <= '"') { gotoCase = 114; continue; };
                        if (yych <= '#') { gotoCase = 124; continue; };
                        { gotoCase = 122; continue; };
                    } else {
                        if (yych == '\'') { gotoCase = 122; continue; };
                        if (yych <= ',') { gotoCase = 124; continue; };
                        { gotoCase = 122; continue; };
                    }
                }
            } else {
                if (yych <= '[') {
                    if (yych <= '<') {
                        if (yych <= '.') { gotoCase = 124; continue; };
                        if (yych <= '9') { gotoCase = 122; continue; };
                        { gotoCase = 124; continue; };
                    } else {
                        if (yych <= '=') { gotoCase = 122; continue; };
                        if (yych <= '?') { gotoCase = 124; continue; };
                        { gotoCase = 122; continue; };
                    }
                } else {
                    if (yych <= '^') {
                        if (yych <= '\\') { gotoCase = 126; continue; };
                        if (yych <= ']') { gotoCase = 122; continue; };
                        { gotoCase = 124; continue; };
                    } else {
                        if (yych == '`') { gotoCase = 124; continue; };
                        if (yych <= 'z') { gotoCase = 122; continue; };
                        { gotoCase = 124; continue; };
                    }
                }
            }
case 34:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych <= '-') {
                if (yych <= '"') {
                    if (yych <= '\f') {
                        if (yych == '\n') { gotoCase = 32; continue; };
                        { gotoCase = 116; continue; };
                    } else {
                        if (yych <= '\r') { gotoCase = 32; continue; };
                        if (yych <= ' ') { gotoCase = 116; continue; };
                        { gotoCase = 112; continue; };
                    }
                } else {
                    if (yych <= '&') {
                        if (yych == '$') { gotoCase = 112; continue; };
                        { gotoCase = 116; continue; };
                    } else {
                        if (yych <= '\'') { gotoCase = 114; continue; };
                        if (yych <= ',') { gotoCase = 116; continue; };
                        { gotoCase = 112; continue; };
                    }
                }
            } else {
                if (yych <= '[') {
                    if (yych <= '<') {
                        if (yych <= '.') { gotoCase = 116; continue; };
                        if (yych <= '9') { gotoCase = 112; continue; };
                        { gotoCase = 116; continue; };
                    } else {
                        if (yych <= '=') { gotoCase = 112; continue; };
                        if (yych <= '?') { gotoCase = 116; continue; };
                        { gotoCase = 112; continue; };
                    }
                } else {
                    if (yych <= '^') {
                        if (yych <= '\\') { gotoCase = 118; continue; };
                        if (yych <= ']') { gotoCase = 112; continue; };
                        { gotoCase = 116; continue; };
                    } else {
                        if (yych == '`') { gotoCase = 116; continue; };
                        if (yych <= 'z') { gotoCase = 112; continue; };
                        { gotoCase = 116; continue; };
                    }
                }
            }
case 35:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych == '.') { gotoCase = 65; continue; };
            if (yych <= '/') { gotoCase = 49; continue; };
            if (yych <= '9') { gotoCase = 50; continue; };
            { gotoCase = 49; continue; };
case 36:
            yych = this._charAt(++cursor);
            if (yych <= '/') { gotoCase = 30; continue; };
            if (yych <= '9') { gotoCase = 68; continue; };
            { gotoCase = 30; continue; };
case 37:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych == '*') { gotoCase = 104; continue; };
            { gotoCase = 49; continue; };
case 38:
            yyaccept = 1;
            yych = this._charAt(YYMARKER = ++cursor);
            switch (yych) {
            case '!':
            case '"':
            case '$':
            case '\'':
            case '-':
            case '/':
            case '=':
            case '@':
            case 'A':
            case 'B':
            case 'C':
            case 'D':
            case 'E':
            case 'F':
            case 'G':
            case 'I':
            case 'J':
            case 'K':
            case 'L':
            case 'M':
            case 'N':
            case 'O':
            case 'P':
            case 'Q':
            case 'R':
            case 'S':
            case 'T':
            case 'U':
            case 'V':
            case 'W':
            case 'X':
            case 'Y':
            case 'Z':
            case '[':
            case ']':
            case 'a':
            case 'b':
            case 'f':
            case 'h':
            case 'j':
            case 'l':
            case 'n':
            case 'o':
            case 'q':
            case 'u':
            case 'v':
            case 'w':
            case 'x':
            case 'y':
            case 'z':    { gotoCase = 48; continue; };
            case '%':    { gotoCase = 67; continue; };
            case '.':    { gotoCase = 65; continue; };
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':    { gotoCase = 50; continue; };
            case 'H':    { gotoCase = 52; continue; };
            case '_':    { gotoCase = 53; continue; };
            case 'c':    { gotoCase = 54; continue; };
            case 'd':    { gotoCase = 55; continue; };
            case 'e':    { gotoCase = 56; continue; };
            case 'g':    { gotoCase = 57; continue; };
            case 'i':    { gotoCase = 58; continue; };
            case 'k':    { gotoCase = 59; continue; };
            case 'm':    { gotoCase = 60; continue; };
            case 'p':    { gotoCase = 61; continue; };
            case 'r':    { gotoCase = 62; continue; };
            case 's':    { gotoCase = 63; continue; };
            case 't':    { gotoCase = 64; continue; };
            default:    { gotoCase = 39; continue; };
            }
case 39:
            {
                    if (this._isPropertyValue())
                        this.tokenType = "css-number";
                    else
                        this.tokenType = null;
                    return cursor;
                }
case 40:
            ++cursor;
            {
                    this.tokenType = null;
                    if (this._condition.parseCondition === this._parseConditions.PROPERTY)
                        this._condition.parseCondition = this._parseConditions.PROPERTY_VALUE;
                    return cursor;
                }
case 42:
            ++cursor;
            {
                    this.tokenType = null;
                    if (this._condition.parseCondition === this._parseConditions.AT_RULE)
                        this._condition.parseCondition = this._parseConditions.INITIAL;
                    else
                        this._condition.parseCondition = this._parseConditions.PROPERTY;
                    return cursor;
                }
case 44:
            ++cursor;
            {
                    this.tokenType = null;
                    if (this._condition.parseCondition === this._parseConditions.AT_RULE)
                        this._condition.parseCondition = this._parseConditions.INITIAL;
                    else
                        this._condition.parseCondition = this._parseConditions.PROPERTY;
                    return cursor;
                }
case 46:
            ++cursor;
            {
                    this.tokenType = null;
                    this._condition.parseCondition = this._parseConditions.INITIAL;
                    return cursor;
                }
case 48:
            ++cursor;
            yych = this._charAt(cursor);
case 49:
            if (yych <= '9') {
                if (yych <= '&') {
                    if (yych <= '"') {
                        if (yych <= ' ') { gotoCase = 32; continue; };
                        { gotoCase = 48; continue; };
                    } else {
                        if (yych == '$') { gotoCase = 48; continue; };
                        { gotoCase = 32; continue; };
                    }
                } else {
                    if (yych <= ',') {
                        if (yych <= '\'') { gotoCase = 48; continue; };
                        { gotoCase = 32; continue; };
                    } else {
                        if (yych == '.') { gotoCase = 32; continue; };
                        { gotoCase = 48; continue; };
                    }
                }
            } else {
                if (yych <= '\\') {
                    if (yych <= '=') {
                        if (yych <= '<') { gotoCase = 32; continue; };
                        { gotoCase = 48; continue; };
                    } else {
                        if (yych <= '?') { gotoCase = 32; continue; };
                        if (yych <= '[') { gotoCase = 48; continue; };
                        { gotoCase = 32; continue; };
                    }
                } else {
                    if (yych <= '_') {
                        if (yych == '^') { gotoCase = 32; continue; };
                        { gotoCase = 48; continue; };
                    } else {
                        if (yych <= '`') { gotoCase = 32; continue; };
                        if (yych <= 'z') { gotoCase = 48; continue; };
                        { gotoCase = 32; continue; };
                    }
                }
            }
case 50:
            yyaccept = 1;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
            switch (yych) {
            case '!':
            case '"':
            case '$':
            case '\'':
            case '-':
            case '/':
            case '=':
            case '@':
            case 'A':
            case 'B':
            case 'C':
            case 'D':
            case 'E':
            case 'F':
            case 'G':
            case 'I':
            case 'J':
            case 'K':
            case 'L':
            case 'M':
            case 'N':
            case 'O':
            case 'P':
            case 'Q':
            case 'R':
            case 'S':
            case 'T':
            case 'U':
            case 'V':
            case 'W':
            case 'X':
            case 'Y':
            case 'Z':
            case '[':
            case ']':
            case 'a':
            case 'b':
            case 'f':
            case 'h':
            case 'j':
            case 'l':
            case 'n':
            case 'o':
            case 'q':
            case 'u':
            case 'v':
            case 'w':
            case 'x':
            case 'y':
            case 'z':    { gotoCase = 48; continue; };
            case '%':    { gotoCase = 67; continue; };
            case '.':    { gotoCase = 65; continue; };
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':    { gotoCase = 50; continue; };
            case 'H':    { gotoCase = 52; continue; };
            case '_':    { gotoCase = 53; continue; };
            case 'c':    { gotoCase = 54; continue; };
            case 'd':    { gotoCase = 55; continue; };
            case 'e':    { gotoCase = 56; continue; };
            case 'g':    { gotoCase = 57; continue; };
            case 'i':    { gotoCase = 58; continue; };
            case 'k':    { gotoCase = 59; continue; };
            case 'm':    { gotoCase = 60; continue; };
            case 'p':    { gotoCase = 61; continue; };
            case 'r':    { gotoCase = 62; continue; };
            case 's':    { gotoCase = 63; continue; };
            case 't':    { gotoCase = 64; continue; };
            default:    { gotoCase = 39; continue; };
            }
case 52:
            yych = this._charAt(++cursor);
            if (yych == 'z') { gotoCase = 63; continue; };
            { gotoCase = 49; continue; };
case 53:
            yych = this._charAt(++cursor);
            if (yych == '_') { gotoCase = 101; continue; };
            { gotoCase = 49; continue; };
case 54:
            yych = this._charAt(++cursor);
            if (yych == 'm') { gotoCase = 63; continue; };
            { gotoCase = 49; continue; };
case 55:
            yych = this._charAt(++cursor);
            if (yych == 'e') { gotoCase = 100; continue; };
            { gotoCase = 49; continue; };
case 56:
            yych = this._charAt(++cursor);
            if (yych == 'm') { gotoCase = 63; continue; };
            if (yych == 'x') { gotoCase = 63; continue; };
            { gotoCase = 49; continue; };
case 57:
            yych = this._charAt(++cursor);
            if (yych == 'r') { gotoCase = 98; continue; };
            { gotoCase = 49; continue; };
case 58:
            yych = this._charAt(++cursor);
            if (yych == 'n') { gotoCase = 63; continue; };
            { gotoCase = 49; continue; };
case 59:
            yych = this._charAt(++cursor);
            if (yych == 'H') { gotoCase = 97; continue; };
            { gotoCase = 49; continue; };
case 60:
            yych = this._charAt(++cursor);
            if (yych == 'm') { gotoCase = 63; continue; };
            if (yych == 's') { gotoCase = 63; continue; };
            { gotoCase = 49; continue; };
case 61:
            yych = this._charAt(++cursor);
            if (yych <= 's') {
                if (yych == 'c') { gotoCase = 63; continue; };
                { gotoCase = 49; continue; };
            } else {
                if (yych <= 't') { gotoCase = 63; continue; };
                if (yych == 'x') { gotoCase = 63; continue; };
                { gotoCase = 49; continue; };
            }
case 62:
            yych = this._charAt(++cursor);
            if (yych == 'a') { gotoCase = 95; continue; };
            if (yych == 'e') { gotoCase = 96; continue; };
            { gotoCase = 49; continue; };
case 63:
            yych = this._charAt(++cursor);
            if (yych <= '9') {
                if (yych <= '&') {
                    if (yych <= '"') {
                        if (yych <= ' ') { gotoCase = 39; continue; };
                        { gotoCase = 48; continue; };
                    } else {
                        if (yych == '$') { gotoCase = 48; continue; };
                        { gotoCase = 39; continue; };
                    }
                } else {
                    if (yych <= ',') {
                        if (yych <= '\'') { gotoCase = 48; continue; };
                        { gotoCase = 39; continue; };
                    } else {
                        if (yych == '.') { gotoCase = 39; continue; };
                        { gotoCase = 48; continue; };
                    }
                }
            } else {
                if (yych <= '\\') {
                    if (yych <= '=') {
                        if (yych <= '<') { gotoCase = 39; continue; };
                        { gotoCase = 48; continue; };
                    } else {
                        if (yych <= '?') { gotoCase = 39; continue; };
                        if (yych <= '[') { gotoCase = 48; continue; };
                        { gotoCase = 39; continue; };
                    }
                } else {
                    if (yych <= '_') {
                        if (yych == '^') { gotoCase = 39; continue; };
                        { gotoCase = 48; continue; };
                    } else {
                        if (yych <= '`') { gotoCase = 39; continue; };
                        if (yych <= 'z') { gotoCase = 48; continue; };
                        { gotoCase = 39; continue; };
                    }
                }
            }
case 64:
            yych = this._charAt(++cursor);
            if (yych == 'u') { gotoCase = 93; continue; };
            { gotoCase = 49; continue; };
case 65:
            yych = this._charAt(++cursor);
            if (yych <= '/') { gotoCase = 66; continue; };
            if (yych <= '9') { gotoCase = 68; continue; };
case 66:
            cursor = YYMARKER;
            if (yyaccept <= 0) {
                { gotoCase = 32; continue; };
            } else {
                { gotoCase = 39; continue; };
            }
case 67:
            yych = this._charAt(++cursor);
            { gotoCase = 39; continue; };
case 68:
            yyaccept = 1;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
            if (yych <= 'f') {
                if (yych <= 'H') {
                    if (yych <= '/') {
                        if (yych == '%') { gotoCase = 67; continue; };
                        { gotoCase = 39; continue; };
                    } else {
                        if (yych <= '9') { gotoCase = 68; continue; };
                        if (yych <= 'G') { gotoCase = 39; continue; };
                        { gotoCase = 80; continue; };
                    }
                } else {
                    if (yych <= 'b') {
                        if (yych == '_') { gotoCase = 72; continue; };
                        { gotoCase = 39; continue; };
                    } else {
                        if (yych <= 'c') { gotoCase = 74; continue; };
                        if (yych <= 'd') { gotoCase = 77; continue; };
                        if (yych >= 'f') { gotoCase = 39; continue; };
                    }
                }
            } else {
                if (yych <= 'm') {
                    if (yych <= 'i') {
                        if (yych <= 'g') { gotoCase = 78; continue; };
                        if (yych <= 'h') { gotoCase = 39; continue; };
                        { gotoCase = 76; continue; };
                    } else {
                        if (yych == 'k') { gotoCase = 81; continue; };
                        if (yych <= 'l') { gotoCase = 39; continue; };
                        { gotoCase = 75; continue; };
                    }
                } else {
                    if (yych <= 'q') {
                        if (yych == 'p') { gotoCase = 73; continue; };
                        { gotoCase = 39; continue; };
                    } else {
                        if (yych <= 'r') { gotoCase = 71; continue; };
                        if (yych <= 's') { gotoCase = 67; continue; };
                        if (yych <= 't') { gotoCase = 79; continue; };
                        { gotoCase = 39; continue; };
                    }
                }
            }
            yych = this._charAt(++cursor);
            if (yych == 'm') { gotoCase = 67; continue; };
            if (yych == 'x') { gotoCase = 67; continue; };
            { gotoCase = 66; continue; };
case 71:
            yych = this._charAt(++cursor);
            if (yych == 'a') { gotoCase = 91; continue; };
            if (yych == 'e') { gotoCase = 92; continue; };
            { gotoCase = 66; continue; };
case 72:
            yych = this._charAt(++cursor);
            if (yych == '_') { gotoCase = 88; continue; };
            { gotoCase = 66; continue; };
case 73:
            yych = this._charAt(++cursor);
            if (yych <= 's') {
                if (yych == 'c') { gotoCase = 67; continue; };
                { gotoCase = 66; continue; };
            } else {
                if (yych <= 't') { gotoCase = 67; continue; };
                if (yych == 'x') { gotoCase = 67; continue; };
                { gotoCase = 66; continue; };
            }
case 74:
            yych = this._charAt(++cursor);
            if (yych == 'm') { gotoCase = 67; continue; };
            { gotoCase = 66; continue; };
case 75:
            yych = this._charAt(++cursor);
            if (yych == 'm') { gotoCase = 67; continue; };
            if (yych == 's') { gotoCase = 67; continue; };
            { gotoCase = 66; continue; };
case 76:
            yych = this._charAt(++cursor);
            if (yych == 'n') { gotoCase = 67; continue; };
            { gotoCase = 66; continue; };
case 77:
            yych = this._charAt(++cursor);
            if (yych == 'e') { gotoCase = 87; continue; };
            { gotoCase = 66; continue; };
case 78:
            yych = this._charAt(++cursor);
            if (yych == 'r') { gotoCase = 85; continue; };
            { gotoCase = 66; continue; };
case 79:
            yych = this._charAt(++cursor);
            if (yych == 'u') { gotoCase = 83; continue; };
            { gotoCase = 66; continue; };
case 80:
            yych = this._charAt(++cursor);
            if (yych == 'z') { gotoCase = 67; continue; };
            { gotoCase = 66; continue; };
case 81:
            yych = this._charAt(++cursor);
            if (yych != 'H') { gotoCase = 66; continue; };
            yych = this._charAt(++cursor);
            if (yych == 'z') { gotoCase = 67; continue; };
            { gotoCase = 66; continue; };
case 83:
            yych = this._charAt(++cursor);
            if (yych != 'r') { gotoCase = 66; continue; };
            yych = this._charAt(++cursor);
            if (yych == 'n') { gotoCase = 67; continue; };
            { gotoCase = 66; continue; };
case 85:
            yych = this._charAt(++cursor);
            if (yych != 'a') { gotoCase = 66; continue; };
            yych = this._charAt(++cursor);
            if (yych == 'd') { gotoCase = 67; continue; };
            { gotoCase = 66; continue; };
case 87:
            yych = this._charAt(++cursor);
            if (yych == 'g') { gotoCase = 67; continue; };
            { gotoCase = 66; continue; };
case 88:
            yych = this._charAt(++cursor);
            if (yych != 'q') { gotoCase = 66; continue; };
            yych = this._charAt(++cursor);
            if (yych != 'e') { gotoCase = 66; continue; };
            yych = this._charAt(++cursor);
            if (yych == 'm') { gotoCase = 67; continue; };
            { gotoCase = 66; continue; };
case 91:
            yych = this._charAt(++cursor);
            if (yych == 'd') { gotoCase = 67; continue; };
            { gotoCase = 66; continue; };
case 92:
            yych = this._charAt(++cursor);
            if (yych == 'm') { gotoCase = 67; continue; };
            { gotoCase = 66; continue; };
case 93:
            yych = this._charAt(++cursor);
            if (yych != 'r') { gotoCase = 49; continue; };
            yych = this._charAt(++cursor);
            if (yych == 'n') { gotoCase = 63; continue; };
            { gotoCase = 49; continue; };
case 95:
            yych = this._charAt(++cursor);
            if (yych == 'd') { gotoCase = 63; continue; };
            { gotoCase = 49; continue; };
case 96:
            yych = this._charAt(++cursor);
            if (yych == 'm') { gotoCase = 63; continue; };
            { gotoCase = 49; continue; };
case 97:
            yych = this._charAt(++cursor);
            if (yych == 'z') { gotoCase = 63; continue; };
            { gotoCase = 49; continue; };
case 98:
            yych = this._charAt(++cursor);
            if (yych != 'a') { gotoCase = 49; continue; };
            yych = this._charAt(++cursor);
            if (yych == 'd') { gotoCase = 63; continue; };
            { gotoCase = 49; continue; };
case 100:
            yych = this._charAt(++cursor);
            if (yych == 'g') { gotoCase = 63; continue; };
            { gotoCase = 49; continue; };
case 101:
            yych = this._charAt(++cursor);
            if (yych != 'q') { gotoCase = 49; continue; };
            yych = this._charAt(++cursor);
            if (yych != 'e') { gotoCase = 49; continue; };
            yych = this._charAt(++cursor);
            if (yych == 'm') { gotoCase = 63; continue; };
            { gotoCase = 49; continue; };
case 104:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '\f') {
                if (yych == '\n') { gotoCase = 108; continue; };
                { gotoCase = 104; continue; };
            } else {
                if (yych <= '\r') { gotoCase = 108; continue; };
                if (yych != '*') { gotoCase = 104; continue; };
            }
case 106:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych == '*') { gotoCase = 106; continue; };
            if (yych == '/') { gotoCase = 110; continue; };
            { gotoCase = 104; continue; };
case 108:
            ++cursor;
            this.setLexCondition(this._lexConditions.COMMENT);
            { this.tokenType = "css-comment"; return cursor; }
case 110:
            ++cursor;
            { this.tokenType = "css-comment"; return cursor; }
case 112:
            yyaccept = 0;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '-') {
                if (yych <= '"') {
                    if (yych <= '\f') {
                        if (yych == '\n') { gotoCase = 32; continue; };
                        { gotoCase = 116; continue; };
                    } else {
                        if (yych <= '\r') { gotoCase = 32; continue; };
                        if (yych <= ' ') { gotoCase = 116; continue; };
                        { gotoCase = 112; continue; };
                    }
                } else {
                    if (yych <= '&') {
                        if (yych == '$') { gotoCase = 112; continue; };
                        { gotoCase = 116; continue; };
                    } else {
                        if (yych <= '\'') { gotoCase = 114; continue; };
                        if (yych <= ',') { gotoCase = 116; continue; };
                        { gotoCase = 112; continue; };
                    }
                }
            } else {
                if (yych <= '[') {
                    if (yych <= '<') {
                        if (yych <= '.') { gotoCase = 116; continue; };
                        if (yych <= '9') { gotoCase = 112; continue; };
                        { gotoCase = 116; continue; };
                    } else {
                        if (yych <= '=') { gotoCase = 112; continue; };
                        if (yych <= '?') { gotoCase = 116; continue; };
                        { gotoCase = 112; continue; };
                    }
                } else {
                    if (yych <= '^') {
                        if (yych <= '\\') { gotoCase = 118; continue; };
                        if (yych <= ']') { gotoCase = 112; continue; };
                        { gotoCase = 116; continue; };
                    } else {
                        if (yych == '`') { gotoCase = 116; continue; };
                        if (yych <= 'z') { gotoCase = 112; continue; };
                        { gotoCase = 116; continue; };
                    }
                }
            }
case 114:
            ++cursor;
            if ((yych = this._charAt(cursor)) <= '9') {
                if (yych <= '&') {
                    if (yych <= '"') {
                        if (yych >= '!') { gotoCase = 48; continue; };
                    } else {
                        if (yych == '$') { gotoCase = 48; continue; };
                    }
                } else {
                    if (yych <= ',') {
                        if (yych <= '\'') { gotoCase = 48; continue; };
                    } else {
                        if (yych != '.') { gotoCase = 48; continue; };
                    }
                }
            } else {
                if (yych <= '\\') {
                    if (yych <= '=') {
                        if (yych >= '=') { gotoCase = 48; continue; };
                    } else {
                        if (yych <= '?') { gotoCase = 115; continue; };
                        if (yych <= '[') { gotoCase = 48; continue; };
                    }
                } else {
                    if (yych <= '_') {
                        if (yych != '^') { gotoCase = 48; continue; };
                    } else {
                        if (yych <= '`') { gotoCase = 115; continue; };
                        if (yych <= 'z') { gotoCase = 48; continue; };
                    }
                }
            }
case 115:
            { return this._stringToken(cursor, true); }
case 116:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '\r') {
                if (yych == '\n') { gotoCase = 66; continue; };
                if (yych <= '\f') { gotoCase = 116; continue; };
                { gotoCase = 66; continue; };
            } else {
                if (yych <= '\'') {
                    if (yych <= '&') { gotoCase = 116; continue; };
                    { gotoCase = 121; continue; };
                } else {
                    if (yych != '\\') { gotoCase = 116; continue; };
                }
            }
case 118:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= 'a') {
                if (yych <= '!') {
                    if (yych <= '\n') {
                        if (yych <= '\t') { gotoCase = 66; continue; };
                    } else {
                        if (yych != '\r') { gotoCase = 66; continue; };
                    }
                } else {
                    if (yych <= '\'') {
                        if (yych <= '"') { gotoCase = 116; continue; };
                        if (yych <= '&') { gotoCase = 66; continue; };
                        { gotoCase = 116; continue; };
                    } else {
                        if (yych == '\\') { gotoCase = 116; continue; };
                        { gotoCase = 66; continue; };
                    }
                }
            } else {
                if (yych <= 'q') {
                    if (yych <= 'f') {
                        if (yych <= 'b') { gotoCase = 116; continue; };
                        if (yych <= 'e') { gotoCase = 66; continue; };
                        { gotoCase = 116; continue; };
                    } else {
                        if (yych == 'n') { gotoCase = 116; continue; };
                        { gotoCase = 66; continue; };
                    }
                } else {
                    if (yych <= 't') {
                        if (yych == 's') { gotoCase = 66; continue; };
                        { gotoCase = 116; continue; };
                    } else {
                        if (yych == 'v') { gotoCase = 116; continue; };
                        { gotoCase = 66; continue; };
                    }
                }
            }
            ++cursor;
            this.setLexCondition(this._lexConditions.SSTRING);
            { return this._stringToken(cursor); }
case 121:
            yych = this._charAt(++cursor);
            { gotoCase = 115; continue; };
case 122:
            yyaccept = 0;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '-') {
                if (yych <= '!') {
                    if (yych <= '\f') {
                        if (yych == '\n') { gotoCase = 32; continue; };
                    } else {
                        if (yych <= '\r') { gotoCase = 32; continue; };
                        if (yych >= '!') { gotoCase = 122; continue; };
                    }
                } else {
                    if (yych <= '$') {
                        if (yych <= '"') { gotoCase = 114; continue; };
                        if (yych >= '$') { gotoCase = 122; continue; };
                    } else {
                        if (yych == '\'') { gotoCase = 122; continue; };
                        if (yych >= '-') { gotoCase = 122; continue; };
                    }
                }
            } else {
                if (yych <= '[') {
                    if (yych <= '<') {
                        if (yych <= '.') { gotoCase = 124; continue; };
                        if (yych <= '9') { gotoCase = 122; continue; };
                    } else {
                        if (yych <= '=') { gotoCase = 122; continue; };
                        if (yych >= '@') { gotoCase = 122; continue; };
                    }
                } else {
                    if (yych <= '^') {
                        if (yych <= '\\') { gotoCase = 126; continue; };
                        if (yych <= ']') { gotoCase = 122; continue; };
                    } else {
                        if (yych == '`') { gotoCase = 124; continue; };
                        if (yych <= 'z') { gotoCase = 122; continue; };
                    }
                }
            }
case 124:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '\r') {
                if (yych == '\n') { gotoCase = 66; continue; };
                if (yych <= '\f') { gotoCase = 124; continue; };
                { gotoCase = 66; continue; };
            } else {
                if (yych <= '"') {
                    if (yych <= '!') { gotoCase = 124; continue; };
                    { gotoCase = 121; continue; };
                } else {
                    if (yych != '\\') { gotoCase = 124; continue; };
                }
            }
case 126:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= 'a') {
                if (yych <= '!') {
                    if (yych <= '\n') {
                        if (yych <= '\t') { gotoCase = 66; continue; };
                    } else {
                        if (yych != '\r') { gotoCase = 66; continue; };
                    }
                } else {
                    if (yych <= '\'') {
                        if (yych <= '"') { gotoCase = 124; continue; };
                        if (yych <= '&') { gotoCase = 66; continue; };
                        { gotoCase = 124; continue; };
                    } else {
                        if (yych == '\\') { gotoCase = 124; continue; };
                        { gotoCase = 66; continue; };
                    }
                }
            } else {
                if (yych <= 'q') {
                    if (yych <= 'f') {
                        if (yych <= 'b') { gotoCase = 124; continue; };
                        if (yych <= 'e') { gotoCase = 66; continue; };
                        { gotoCase = 124; continue; };
                    } else {
                        if (yych == 'n') { gotoCase = 124; continue; };
                        { gotoCase = 66; continue; };
                    }
                } else {
                    if (yych <= 't') {
                        if (yych == 's') { gotoCase = 66; continue; };
                        { gotoCase = 124; continue; };
                    } else {
                        if (yych == 'v') { gotoCase = 124; continue; };
                        { gotoCase = 66; continue; };
                    }
                }
            }
            ++cursor;
            this.setLexCondition(this._lexConditions.DSTRING);
            { return this._stringToken(cursor); }
/* *********************************** */
case this.case_SSTRING:
            yych = this._charAt(cursor);
            if (yych <= '\r') {
                if (yych == '\n') { gotoCase = 133; continue; };
                if (yych <= '\f') { gotoCase = 132; continue; };
                { gotoCase = 133; continue; };
            } else {
                if (yych <= '\'') {
                    if (yych <= '&') { gotoCase = 132; continue; };
                    { gotoCase = 135; continue; };
                } else {
                    if (yych == '\\') { gotoCase = 137; continue; };
                    { gotoCase = 132; continue; };
                }
            }
case 131:
            { return this._stringToken(cursor); }
case 132:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            { gotoCase = 139; continue; };
case 133:
            ++cursor;
case 134:
            { this.tokenType = null; return cursor; }
case 135:
            ++cursor;
case 136:
            this.setLexCondition(this._lexConditions.INITIAL);
            { return this._stringToken(cursor, true); }
case 137:
            yych = this._charAt(++cursor);
            if (yych <= 'e') {
                if (yych <= '\'') {
                    if (yych == '"') { gotoCase = 138; continue; };
                    if (yych <= '&') { gotoCase = 134; continue; };
                } else {
                    if (yych <= '\\') {
                        if (yych <= '[') { gotoCase = 134; continue; };
                    } else {
                        if (yych != 'b') { gotoCase = 134; continue; };
                    }
                }
            } else {
                if (yych <= 'r') {
                    if (yych <= 'm') {
                        if (yych >= 'g') { gotoCase = 134; continue; };
                    } else {
                        if (yych <= 'n') { gotoCase = 138; continue; };
                        if (yych <= 'q') { gotoCase = 134; continue; };
                    }
                } else {
                    if (yych <= 't') {
                        if (yych <= 's') { gotoCase = 134; continue; };
                    } else {
                        if (yych != 'v') { gotoCase = 134; continue; };
                    }
                }
            }
case 138:
            yyaccept = 0;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
case 139:
            if (yych <= '\r') {
                if (yych == '\n') { gotoCase = 131; continue; };
                if (yych <= '\f') { gotoCase = 138; continue; };
                { gotoCase = 131; continue; };
            } else {
                if (yych <= '\'') {
                    if (yych <= '&') { gotoCase = 138; continue; };
                    { gotoCase = 142; continue; };
                } else {
                    if (yych != '\\') { gotoCase = 138; continue; };
                }
            }
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= 'e') {
                if (yych <= '\'') {
                    if (yych == '"') { gotoCase = 138; continue; };
                    if (yych >= '\'') { gotoCase = 138; continue; };
                } else {
                    if (yych <= '\\') {
                        if (yych >= '\\') { gotoCase = 138; continue; };
                    } else {
                        if (yych == 'b') { gotoCase = 138; continue; };
                    }
                }
            } else {
                if (yych <= 'r') {
                    if (yych <= 'm') {
                        if (yych <= 'f') { gotoCase = 138; continue; };
                    } else {
                        if (yych <= 'n') { gotoCase = 138; continue; };
                        if (yych >= 'r') { gotoCase = 138; continue; };
                    }
                } else {
                    if (yych <= 't') {
                        if (yych >= 't') { gotoCase = 138; continue; };
                    } else {
                        if (yych == 'v') { gotoCase = 138; continue; };
                    }
                }
            }
            cursor = YYMARKER;
            { gotoCase = 131; continue; };
case 142:
            ++cursor;
            yych = this._charAt(cursor);
            { gotoCase = 136; continue; };
        }

        }
    }
}

WebInspector.SourceCSSTokenizer.prototype.__proto__ = WebInspector.SourceTokenizer.prototype;
/* Generated by re2c 0.13.5 on Fri May  6 13:47:06 2011 */
/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// Generate js file as follows:
//
// re2c -isc WebCore/inspector/front-end/SourceHTMLTokenizer.re2js \
// | sed 's|^yy\([^:]*\)*\:|case \1:|' \
// | sed 's|[*]cursor[+][+]|this._charAt(cursor++)|' \
// | sed 's|[[*][+][+]cursor|this._charAt(++cursor)|' \
// | sed 's|[*]cursor|this._charAt(cursor)|' \
// | sed 's|yych = \*\([^;]*\)|yych = this._charAt\1|' \
// | sed 's|{ gotoCase = \([^; continue; };]*\)|{ gotoCase = \1; continue; }|' \
// | sed 's|unsigned\ int|var|' \
// | sed 's|var\ yych|case 1: case 1: var yych|'

/**
 * @constructor
 * @extends {WebInspector.SourceTokenizer}
 */
WebInspector.SourceHTMLTokenizer = function()
{
    WebInspector.SourceTokenizer.call(this);

    // The order is determined by the generated code.
    this._lexConditions = {
        INITIAL: 0,
        COMMENT: 1,
        DOCTYPE: 2,
        TAG: 3,
        DSTRING: 4,
        SSTRING: 5
    };
    this.case_INITIAL = 1000;
    this.case_COMMENT = 1001;
    this.case_DOCTYPE = 1002;
    this.case_TAG = 1003;
    this.case_DSTRING = 1004;
    this.case_SSTRING = 1005;

    this._parseConditions = {
        INITIAL: 0,
        ATTRIBUTE: 1,
        ATTRIBUTE_VALUE: 2,
        LINKIFY: 4,
        A_NODE: 8,
        SCRIPT: 16,
        STYLE: 32
    };

    this.condition = this.createInitialCondition();
}

WebInspector.SourceHTMLTokenizer.prototype = {
    createInitialCondition: function()
    {
        return { lexCondition: this._lexConditions.INITIAL, parseCondition: this._parseConditions.INITIAL };
    },

    set line(line) {
        if (this._condition.internalJavaScriptTokenizerCondition) {
            var match = /<\/script/i.exec(line);
            if (match) {
                this._internalJavaScriptTokenizer.line = line.substring(0, match.index);
            } else
                this._internalJavaScriptTokenizer.line = line;
        } else if (this._condition.internalCSSTokenizerCondition) {
            var match = /<\/style/i.exec(line);
            if (match) {
                this._internalCSSTokenizer.line = line.substring(0, match.index);
            } else
                this._internalCSSTokenizer.line = line;
        }
        this._line = line;
    },

    _isExpectingAttribute: function()
    {
        return this._condition.parseCondition & this._parseConditions.ATTRIBUTE;
    },

    _isExpectingAttributeValue: function()
    {
        return this._condition.parseCondition & this._parseConditions.ATTRIBUTE_VALUE;
    },

    _setExpectingAttribute: function()
    {
        if (this._isExpectingAttributeValue())
            this._condition.parseCondition ^= this._parseConditions.ATTRIBUTE_VALUE;
        this._condition.parseCondition |= this._parseConditions.ATTRIBUTE;
    },

    _setExpectingAttributeValue: function()
    {
        if (this._isExpectingAttribute())
            this._condition.parseCondition ^= this._parseConditions.ATTRIBUTE;
        this._condition.parseCondition |= this._parseConditions.ATTRIBUTE_VALUE;
    },

    /**
     * @param {boolean=} stringEnds
     */
    _stringToken: function(cursor, stringEnds)
    {
        if (!this._isExpectingAttributeValue()) {
            this.tokenType = null;
            return cursor;
        }
        this.tokenType = this._attrValueTokenType();
        if (stringEnds)
            this._setExpectingAttribute();
        return cursor;
    },

    _attrValueTokenType: function()
    {
        if (this._condition.parseCondition & this._parseConditions.LINKIFY) {
            if (this._condition.parseCondition & this._parseConditions.A_NODE)
                return "html-external-link";
            return "html-resource-link";
        }
        return "html-attribute-value";
    },

    get _internalJavaScriptTokenizer()
    {
        return WebInspector.SourceTokenizer.Registry.getInstance().getTokenizer("text/javascript");
    },

    get _internalCSSTokenizer()
    {
        return WebInspector.SourceTokenizer.Registry.getInstance().getTokenizer("text/css");
    },

    scriptStarted: function(cursor)
    {
        this._condition.internalJavaScriptTokenizerCondition = this._internalJavaScriptTokenizer.createInitialCondition();
    },

    scriptEnded: function(cursor)
    {
    },

    styleSheetStarted: function(cursor)
    {
        this._condition.internalCSSTokenizerCondition = this._internalCSSTokenizer.createInitialCondition();
    },

    styleSheetEnded: function(cursor)
    {
    },

    nextToken: function(cursor)
    {
        if (this._condition.internalJavaScriptTokenizerCondition) {
            // Re-set line to force </script> detection first.
            this.line = this._line;
            if (cursor !== this._internalJavaScriptTokenizer._line.length) {
                // Tokenizer is stateless, so restore its condition before tokenizing and save it after.
                this._internalJavaScriptTokenizer.condition = this._condition.internalJavaScriptTokenizerCondition;
                var result = this._internalJavaScriptTokenizer.nextToken(cursor);
                this.tokenType = this._internalJavaScriptTokenizer.tokenType;
                this._condition.internalJavaScriptTokenizerCondition = this._internalJavaScriptTokenizer.condition;
                return result;
            } else if (cursor !== this._line.length)
                delete this._condition.internalJavaScriptTokenizerCondition;
        } else if (this._condition.internalCSSTokenizerCondition) {
            // Re-set line to force </style> detection first.
            this.line = this._line;
            if (cursor !== this._internalCSSTokenizer._line.length) {
                // Tokenizer is stateless, so restore its condition before tokenizing and save it after.
                this._internalCSSTokenizer.condition = this._condition.internalCSSTokenizerCondition;
                var result = this._internalCSSTokenizer.nextToken(cursor);
                this.tokenType = this._internalCSSTokenizer.tokenType;
                this._condition.internalCSSTokenizerCondition = this._internalCSSTokenizer.condition;
                return result;
            } else if (cursor !== this._line.length)
                delete this._condition.internalCSSTokenizerCondition;
        }

        var cursorOnEnter = cursor;
        var gotoCase = 1;
        var YYMARKER;
        while (1) {
            switch (gotoCase)
            // Following comment is replaced with generated state machine.

        {
            case 1: var yych;
            var yyaccept = 0;
            if (this.getLexCondition() < 3) {
                if (this.getLexCondition() < 1) {
                    { gotoCase = this.case_INITIAL; continue; };
                } else {
                    if (this.getLexCondition() < 2) {
                        { gotoCase = this.case_COMMENT; continue; };
                    } else {
                        { gotoCase = this.case_DOCTYPE; continue; };
                    }
                }
            } else {
                if (this.getLexCondition() < 4) {
                    { gotoCase = this.case_TAG; continue; };
                } else {
                    if (this.getLexCondition() < 5) {
                        { gotoCase = this.case_DSTRING; continue; };
                    } else {
                        { gotoCase = this.case_SSTRING; continue; };
                    }
                }
            }
/* *********************************** */
case this.case_COMMENT:

            yych = this._charAt(cursor);
            if (yych <= '\f') {
                if (yych == '\n') { gotoCase = 4; continue; };
                { gotoCase = 3; continue; };
            } else {
                if (yych <= '\r') { gotoCase = 4; continue; };
                if (yych == '-') { gotoCase = 6; continue; };
                { gotoCase = 3; continue; };
            }
case 2:
            { this.tokenType = "html-comment"; return cursor; }
case 3:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            { gotoCase = 9; continue; };
case 4:
            ++cursor;
case 5:
            { this.tokenType = null; return cursor; }
case 6:
            yyaccept = 1;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych != '-') { gotoCase = 5; continue; };
case 7:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych == '>') { gotoCase = 10; continue; };
case 8:
            yyaccept = 0;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
case 9:
            if (yych <= '\f') {
                if (yych == '\n') { gotoCase = 2; continue; };
                { gotoCase = 8; continue; };
            } else {
                if (yych <= '\r') { gotoCase = 2; continue; };
                if (yych == '-') { gotoCase = 12; continue; };
                { gotoCase = 8; continue; };
            }
case 10:
            ++cursor;
            this.setLexCondition(this._lexConditions.INITIAL);
            { this.tokenType = "html-comment"; return cursor; }
case 12:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych == '-') { gotoCase = 7; continue; };
            cursor = YYMARKER;
            if (yyaccept <= 0) {
                { gotoCase = 2; continue; };
            } else {
                { gotoCase = 5; continue; };
            }
/* *********************************** */
case this.case_DOCTYPE:
            yych = this._charAt(cursor);
            if (yych <= '\f') {
                if (yych == '\n') { gotoCase = 18; continue; };
                { gotoCase = 17; continue; };
            } else {
                if (yych <= '\r') { gotoCase = 18; continue; };
                if (yych == '>') { gotoCase = 20; continue; };
                { gotoCase = 17; continue; };
            }
case 16:
            { this.tokenType = "html-doctype"; return cursor; }
case 17:
            yych = this._charAt(++cursor);
            { gotoCase = 23; continue; };
case 18:
            ++cursor;
            { this.tokenType = null; return cursor; }
case 20:
            ++cursor;
            this.setLexCondition(this._lexConditions.INITIAL);
            { this.tokenType = "html-doctype"; return cursor; }
case 22:
            ++cursor;
            yych = this._charAt(cursor);
case 23:
            if (yych <= '\f') {
                if (yych == '\n') { gotoCase = 16; continue; };
                { gotoCase = 22; continue; };
            } else {
                if (yych <= '\r') { gotoCase = 16; continue; };
                if (yych == '>') { gotoCase = 16; continue; };
                { gotoCase = 22; continue; };
            }
/* *********************************** */
case this.case_DSTRING:
            yych = this._charAt(cursor);
            if (yych <= '\f') {
                if (yych == '\n') { gotoCase = 28; continue; };
                { gotoCase = 27; continue; };
            } else {
                if (yych <= '\r') { gotoCase = 28; continue; };
                if (yych == '"') { gotoCase = 30; continue; };
                { gotoCase = 27; continue; };
            }
case 26:
            { return this._stringToken(cursor); }
case 27:
            yych = this._charAt(++cursor);
            { gotoCase = 34; continue; };
case 28:
            ++cursor;
            { this.tokenType = null; return cursor; }
case 30:
            ++cursor;
case 31:
            this.setLexCondition(this._lexConditions.TAG);
            { return this._stringToken(cursor, true); }
case 32:
            yych = this._charAt(++cursor);
            { gotoCase = 31; continue; };
case 33:
            ++cursor;
            yych = this._charAt(cursor);
case 34:
            if (yych <= '\f') {
                if (yych == '\n') { gotoCase = 26; continue; };
                { gotoCase = 33; continue; };
            } else {
                if (yych <= '\r') { gotoCase = 26; continue; };
                if (yych == '"') { gotoCase = 32; continue; };
                { gotoCase = 33; continue; };
            }
/* *********************************** */
case this.case_INITIAL:
            yych = this._charAt(cursor);
            if (yych == '<') { gotoCase = 39; continue; };
            ++cursor;
            { this.tokenType = null; return cursor; }
case 39:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych <= '/') {
                if (yych == '!') { gotoCase = 44; continue; };
                if (yych >= '/') { gotoCase = 41; continue; };
            } else {
                if (yych <= 'S') {
                    if (yych >= 'S') { gotoCase = 42; continue; };
                } else {
                    if (yych == 's') { gotoCase = 42; continue; };
                }
            }
case 40:
            this.setLexCondition(this._lexConditions.TAG);
            {
                    if (this._condition.parseCondition & (this._parseConditions.SCRIPT | this._parseConditions.STYLE)) {
                        // Do not tokenize script and style tag contents, keep lexer state, even though processing "<".
                        this.setLexCondition(this._lexConditions.INITIAL);
                        this.tokenType = null;
                        return cursor;
                    }

                    this._condition.parseCondition = this._parseConditions.INITIAL;
                    this.tokenType = "html-tag";
                    return cursor;
                }
case 41:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych == 'S') { gotoCase = 73; continue; };
            if (yych == 's') { gotoCase = 73; continue; };
            { gotoCase = 40; continue; };
case 42:
            yych = this._charAt(++cursor);
            if (yych <= 'T') {
                if (yych == 'C') { gotoCase = 62; continue; };
                if (yych >= 'T') { gotoCase = 63; continue; };
            } else {
                if (yych <= 'c') {
                    if (yych >= 'c') { gotoCase = 62; continue; };
                } else {
                    if (yych == 't') { gotoCase = 63; continue; };
                }
            }
case 43:
            cursor = YYMARKER;
            { gotoCase = 40; continue; };
case 44:
            yych = this._charAt(++cursor);
            if (yych <= 'C') {
                if (yych != '-') { gotoCase = 43; continue; };
            } else {
                if (yych <= 'D') { gotoCase = 46; continue; };
                if (yych == 'd') { gotoCase = 46; continue; };
                { gotoCase = 43; continue; };
            }
            yych = this._charAt(++cursor);
            if (yych == '-') { gotoCase = 54; continue; };
            { gotoCase = 43; continue; };
case 46:
            yych = this._charAt(++cursor);
            if (yych == 'O') { gotoCase = 47; continue; };
            if (yych != 'o') { gotoCase = 43; continue; };
case 47:
            yych = this._charAt(++cursor);
            if (yych == 'C') { gotoCase = 48; continue; };
            if (yych != 'c') { gotoCase = 43; continue; };
case 48:
            yych = this._charAt(++cursor);
            if (yych == 'T') { gotoCase = 49; continue; };
            if (yych != 't') { gotoCase = 43; continue; };
case 49:
            yych = this._charAt(++cursor);
            if (yych == 'Y') { gotoCase = 50; continue; };
            if (yych != 'y') { gotoCase = 43; continue; };
case 50:
            yych = this._charAt(++cursor);
            if (yych == 'P') { gotoCase = 51; continue; };
            if (yych != 'p') { gotoCase = 43; continue; };
case 51:
            yych = this._charAt(++cursor);
            if (yych == 'E') { gotoCase = 52; continue; };
            if (yych != 'e') { gotoCase = 43; continue; };
case 52:
            ++cursor;
            this.setLexCondition(this._lexConditions.DOCTYPE);
            { this.tokenType = "html-doctype"; return cursor; }
case 54:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '\f') {
                if (yych == '\n') { gotoCase = 57; continue; };
                { gotoCase = 54; continue; };
            } else {
                if (yych <= '\r') { gotoCase = 57; continue; };
                if (yych != '-') { gotoCase = 54; continue; };
            }
            ++cursor;
            yych = this._charAt(cursor);
            if (yych == '-') { gotoCase = 59; continue; };
            { gotoCase = 43; continue; };
case 57:
            ++cursor;
            this.setLexCondition(this._lexConditions.COMMENT);
            { this.tokenType = "html-comment"; return cursor; }
case 59:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych != '>') { gotoCase = 54; continue; };
            ++cursor;
            { this.tokenType = "html-comment"; return cursor; }
case 62:
            yych = this._charAt(++cursor);
            if (yych == 'R') { gotoCase = 68; continue; };
            if (yych == 'r') { gotoCase = 68; continue; };
            { gotoCase = 43; continue; };
case 63:
            yych = this._charAt(++cursor);
            if (yych == 'Y') { gotoCase = 64; continue; };
            if (yych != 'y') { gotoCase = 43; continue; };
case 64:
            yych = this._charAt(++cursor);
            if (yych == 'L') { gotoCase = 65; continue; };
            if (yych != 'l') { gotoCase = 43; continue; };
case 65:
            yych = this._charAt(++cursor);
            if (yych == 'E') { gotoCase = 66; continue; };
            if (yych != 'e') { gotoCase = 43; continue; };
case 66:
            ++cursor;
            this.setLexCondition(this._lexConditions.TAG);
            {
                    if (this._condition.parseCondition & this._parseConditions.STYLE) {
                        // Do not tokenize style tag contents, keep lexer state, even though processing "<".
                        this.setLexCondition(this._lexConditions.INITIAL);
                        this.tokenType = null;
                        return cursor;
                    }
                    this.tokenType = "html-tag";
                    this._condition.parseCondition = this._parseConditions.STYLE;
                    this._setExpectingAttribute();
                    return cursor;
                }
case 68:
            yych = this._charAt(++cursor);
            if (yych == 'I') { gotoCase = 69; continue; };
            if (yych != 'i') { gotoCase = 43; continue; };
case 69:
            yych = this._charAt(++cursor);
            if (yych == 'P') { gotoCase = 70; continue; };
            if (yych != 'p') { gotoCase = 43; continue; };
case 70:
            yych = this._charAt(++cursor);
            if (yych == 'T') { gotoCase = 71; continue; };
            if (yych != 't') { gotoCase = 43; continue; };
case 71:
            ++cursor;
            this.setLexCondition(this._lexConditions.TAG);
            {
                    if (this._condition.parseCondition & this._parseConditions.SCRIPT) {
                        // Do not tokenize script tag contents, keep lexer state, even though processing "<".
                        this.setLexCondition(this._lexConditions.INITIAL);
                        this.tokenType = null;
                        return cursor;
                    }
                    this.tokenType = "html-tag";
                    this._condition.parseCondition = this._parseConditions.SCRIPT;
                    this._setExpectingAttribute();
                    return cursor;
                }
case 73:
            yych = this._charAt(++cursor);
            if (yych <= 'T') {
                if (yych == 'C') { gotoCase = 75; continue; };
                if (yych <= 'S') { gotoCase = 43; continue; };
            } else {
                if (yych <= 'c') {
                    if (yych <= 'b') { gotoCase = 43; continue; };
                    { gotoCase = 75; continue; };
                } else {
                    if (yych != 't') { gotoCase = 43; continue; };
                }
            }
            yych = this._charAt(++cursor);
            if (yych == 'Y') { gotoCase = 81; continue; };
            if (yych == 'y') { gotoCase = 81; continue; };
            { gotoCase = 43; continue; };
case 75:
            yych = this._charAt(++cursor);
            if (yych == 'R') { gotoCase = 76; continue; };
            if (yych != 'r') { gotoCase = 43; continue; };
case 76:
            yych = this._charAt(++cursor);
            if (yych == 'I') { gotoCase = 77; continue; };
            if (yych != 'i') { gotoCase = 43; continue; };
case 77:
            yych = this._charAt(++cursor);
            if (yych == 'P') { gotoCase = 78; continue; };
            if (yych != 'p') { gotoCase = 43; continue; };
case 78:
            yych = this._charAt(++cursor);
            if (yych == 'T') { gotoCase = 79; continue; };
            if (yych != 't') { gotoCase = 43; continue; };
case 79:
            ++cursor;
            this.setLexCondition(this._lexConditions.TAG);
            {
                    this.tokenType = "html-tag";
                    this._condition.parseCondition = this._parseConditions.INITIAL;
                    this.scriptEnded(cursor - 8);
                    return cursor;
                }
case 81:
            yych = this._charAt(++cursor);
            if (yych == 'L') { gotoCase = 82; continue; };
            if (yych != 'l') { gotoCase = 43; continue; };
case 82:
            yych = this._charAt(++cursor);
            if (yych == 'E') { gotoCase = 83; continue; };
            if (yych != 'e') { gotoCase = 43; continue; };
case 83:
            ++cursor;
            this.setLexCondition(this._lexConditions.TAG);
            {
                    this.tokenType = "html-tag";
                    this._condition.parseCondition = this._parseConditions.INITIAL;
                    this.styleSheetEnded(cursor - 7);
                    return cursor;
                }
/* *********************************** */
case this.case_SSTRING:
            yych = this._charAt(cursor);
            if (yych <= '\f') {
                if (yych == '\n') { gotoCase = 89; continue; };
                { gotoCase = 88; continue; };
            } else {
                if (yych <= '\r') { gotoCase = 89; continue; };
                if (yych == '\'') { gotoCase = 91; continue; };
                { gotoCase = 88; continue; };
            }
case 87:
            { return this._stringToken(cursor); }
case 88:
            yych = this._charAt(++cursor);
            { gotoCase = 95; continue; };
case 89:
            ++cursor;
            { this.tokenType = null; return cursor; }
case 91:
            ++cursor;
case 92:
            this.setLexCondition(this._lexConditions.TAG);
            { return this._stringToken(cursor, true); }
case 93:
            yych = this._charAt(++cursor);
            { gotoCase = 92; continue; };
case 94:
            ++cursor;
            yych = this._charAt(cursor);
case 95:
            if (yych <= '\f') {
                if (yych == '\n') { gotoCase = 87; continue; };
                { gotoCase = 94; continue; };
            } else {
                if (yych <= '\r') { gotoCase = 87; continue; };
                if (yych == '\'') { gotoCase = 93; continue; };
                { gotoCase = 94; continue; };
            }
/* *********************************** */
case this.case_TAG:
            yych = this._charAt(cursor);
            if (yych <= '&') {
                if (yych <= '\r') {
                    if (yych == '\n') { gotoCase = 100; continue; };
                    if (yych >= '\r') { gotoCase = 100; continue; };
                } else {
                    if (yych <= ' ') {
                        if (yych >= ' ') { gotoCase = 100; continue; };
                    } else {
                        if (yych == '"') { gotoCase = 102; continue; };
                    }
                }
            } else {
                if (yych <= '>') {
                    if (yych <= ';') {
                        if (yych <= '\'') { gotoCase = 103; continue; };
                    } else {
                        if (yych <= '<') { gotoCase = 100; continue; };
                        if (yych <= '=') { gotoCase = 104; continue; };
                        { gotoCase = 106; continue; };
                    }
                } else {
                    if (yych <= '[') {
                        if (yych >= '[') { gotoCase = 100; continue; };
                    } else {
                        if (yych == ']') { gotoCase = 100; continue; };
                    }
                }
            }
            ++cursor;
            yych = this._charAt(cursor);
            { gotoCase = 119; continue; };
case 99:
            {
                    if (this._condition.parseCondition === this._parseConditions.SCRIPT || this._condition.parseCondition === this._parseConditions.STYLE) {
                        // Fall through if expecting attributes.
                        this.tokenType = null;
                        return cursor;
                    }

                    if (this._condition.parseCondition === this._parseConditions.INITIAL) {
                        this.tokenType = "html-tag";
                        this._setExpectingAttribute();
                        var token = this._line.substring(cursorOnEnter, cursor);
                        if (token === "a")
                            this._condition.parseCondition |= this._parseConditions.A_NODE;
                        else if (this._condition.parseCondition & this._parseConditions.A_NODE)
                            this._condition.parseCondition ^= this._parseConditions.A_NODE;
                    } else if (this._isExpectingAttribute()) {
                        var token = this._line.substring(cursorOnEnter, cursor);
                        if (token === "href" || token === "src")
                            this._condition.parseCondition |= this._parseConditions.LINKIFY;
                        else if (this._condition.parseCondition |= this._parseConditions.LINKIFY)
                            this._condition.parseCondition ^= this._parseConditions.LINKIFY;
                        this.tokenType = "html-attribute-name";
                    } else if (this._isExpectingAttributeValue())
                        this.tokenType = this._attrValueTokenType();
                    else
                        this.tokenType = null;
                    return cursor;
                }
case 100:
            ++cursor;
            { this.tokenType = null; return cursor; }
case 102:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            { gotoCase = 115; continue; };
case 103:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            { gotoCase = 109; continue; };
case 104:
            ++cursor;
            {
                    if (this._isExpectingAttribute())
                        this._setExpectingAttributeValue();
                    this.tokenType = null;
                    return cursor;
                }
case 106:
            ++cursor;
            this.setLexCondition(this._lexConditions.INITIAL);
            {
                    this.tokenType = "html-tag";
                    if (this._condition.parseCondition & this._parseConditions.SCRIPT) {
                        this.scriptStarted(cursor);
                        // Do not tokenize script tag contents.
                        return cursor;
                    }

                    if (this._condition.parseCondition & this._parseConditions.STYLE) {
                        this.styleSheetStarted(cursor);
                        // Do not tokenize style tag contents.
                        return cursor;
                    }

                    this._condition.parseCondition = this._parseConditions.INITIAL;
                    return cursor;
                }
case 108:
            ++cursor;
            yych = this._charAt(cursor);
case 109:
            if (yych <= '\f') {
                if (yych != '\n') { gotoCase = 108; continue; };
            } else {
                if (yych <= '\r') { gotoCase = 110; continue; };
                if (yych == '\'') { gotoCase = 112; continue; };
                { gotoCase = 108; continue; };
            }
case 110:
            ++cursor;
            this.setLexCondition(this._lexConditions.SSTRING);
            { return this._stringToken(cursor); }
case 112:
            ++cursor;
            { return this._stringToken(cursor, true); }
case 114:
            ++cursor;
            yych = this._charAt(cursor);
case 115:
            if (yych <= '\f') {
                if (yych != '\n') { gotoCase = 114; continue; };
            } else {
                if (yych <= '\r') { gotoCase = 116; continue; };
                if (yych == '"') { gotoCase = 112; continue; };
                { gotoCase = 114; continue; };
            }
case 116:
            ++cursor;
            this.setLexCondition(this._lexConditions.DSTRING);
            { return this._stringToken(cursor); }
case 118:
            ++cursor;
            yych = this._charAt(cursor);
case 119:
            if (yych <= '"') {
                if (yych <= '\r') {
                    if (yych == '\n') { gotoCase = 99; continue; };
                    if (yych <= '\f') { gotoCase = 118; continue; };
                    { gotoCase = 99; continue; };
                } else {
                    if (yych == ' ') { gotoCase = 99; continue; };
                    if (yych <= '!') { gotoCase = 118; continue; };
                    { gotoCase = 99; continue; };
                }
            } else {
                if (yych <= '>') {
                    if (yych == '\'') { gotoCase = 99; continue; };
                    if (yych <= ';') { gotoCase = 118; continue; };
                    { gotoCase = 99; continue; };
                } else {
                    if (yych <= '[') {
                        if (yych <= 'Z') { gotoCase = 118; continue; };
                        { gotoCase = 99; continue; };
                    } else {
                        if (yych == ']') { gotoCase = 99; continue; };
                        { gotoCase = 118; continue; };
                    }
                }
            }
        }

        }
    }
}

WebInspector.SourceHTMLTokenizer.prototype.__proto__ = WebInspector.SourceTokenizer.prototype;
/* Generated by re2c 0.13.5 on Fri May 13 20:01:13 2011 */
/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// Generate js file as follows:
//
// re2c -isc WebCore/inspector/front-end/SourceJavaScriptTokenizer.re2js \
// | sed 's|^yy\([^:]*\)*\:|case \1:|' \
// | sed 's|[*]cursor[+][+]|this._charAt(cursor++)|' \
// | sed 's|[[*][+][+]cursor|this._charAt(++cursor)|' \
// | sed 's|[*]cursor|this._charAt(cursor)|' \
// | sed 's|yych = \*\([^;]*\)|yych = this._charAt\1|' \
// | sed 's|{ gotoCase = \([^; continue; };]*\)|{ gotoCase = \1; continue; }|' \
// | sed 's|yych <= \(0x[0-9a-fA-f]+\)|yych <= String.fromCharCode(\1)|' \
// | sed 's|unsigned\ int|var|' \
// | sed 's|var\ yych|case 1: case 1: var yych|'

/**
 * @constructor
 * @extends {WebInspector.SourceTokenizer}
 */
WebInspector.SourceJavaScriptTokenizer = function()
{
    WebInspector.SourceTokenizer.call(this);

    this._keywords = [
        "null", "true", "false", "break", "case", "catch", "const", "default", "finally", "for",
        "instanceof", "new", "var", "continue", "function", "return", "void", "delete", "if",
        "this", "do", "while", "else", "in", "switch", "throw", "try", "typeof", "debugger",
        "class", "enum", "export", "extends", "import", "super", "get", "set", "with"
    ].keySet();

    this._lexConditions = {
        DIV: 0,
        NODIV: 1,
        COMMENT: 2,
        DSTRING: 3,
        SSTRING: 4,
        REGEX: 5
    };

    this.case_DIV = 1000;
    this.case_NODIV = 1001;
    this.case_COMMENT = 1002;
    this.case_DSTRING = 1003;
    this.case_SSTRING = 1004;
    this.case_REGEX = 1005;

    this.condition = this.createInitialCondition();
}

WebInspector.SourceJavaScriptTokenizer.prototype = {
    createInitialCondition: function()
    {
        return { lexCondition: this._lexConditions.NODIV };
    },

    nextToken: function(cursor)
    {
        var cursorOnEnter = cursor;
        var gotoCase = 1;
        var YYMARKER;
        while (1) {
            switch (gotoCase)
            // Following comment is replaced with generated state machine.

        {
            case 1: var yych;
            var yyaccept = 0;
            if (this.getLexCondition() < 3) {
                if (this.getLexCondition() < 1) {
                    { gotoCase = this.case_DIV; continue; };
                } else {
                    if (this.getLexCondition() < 2) {
                        { gotoCase = this.case_NODIV; continue; };
                    } else {
                        { gotoCase = this.case_COMMENT; continue; };
                    }
                }
            } else {
                if (this.getLexCondition() < 4) {
                    { gotoCase = this.case_DSTRING; continue; };
                } else {
                    if (this.getLexCondition() < 5) {
                        { gotoCase = this.case_SSTRING; continue; };
                    } else {
                        { gotoCase = this.case_REGEX; continue; };
                    }
                }
            }
/* *********************************** */
case this.case_COMMENT:

            yych = this._charAt(cursor);
            if (yych <= '\f') {
                if (yych == '\n') { gotoCase = 4; continue; };
                { gotoCase = 3; continue; };
            } else {
                if (yych <= '\r') { gotoCase = 4; continue; };
                if (yych == '*') { gotoCase = 6; continue; };
                { gotoCase = 3; continue; };
            }
case 2:
            { this.tokenType = "javascript-comment"; return cursor; }
case 3:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            { gotoCase = 12; continue; };
case 4:
            ++cursor;
            { this.tokenType = null; return cursor; }
case 6:
            yyaccept = 1;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych == '*') { gotoCase = 9; continue; };
            if (yych != '/') { gotoCase = 11; continue; };
case 7:
            ++cursor;
            this.setLexCondition(this._lexConditions.NODIV);
            { this.tokenType = "javascript-comment"; return cursor; }
case 9:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych == '*') { gotoCase = 9; continue; };
            if (yych == '/') { gotoCase = 7; continue; };
case 11:
            yyaccept = 0;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
case 12:
            if (yych <= '\f') {
                if (yych == '\n') { gotoCase = 2; continue; };
                { gotoCase = 11; continue; };
            } else {
                if (yych <= '\r') { gotoCase = 2; continue; };
                if (yych == '*') { gotoCase = 9; continue; };
                { gotoCase = 11; continue; };
            }
/* *********************************** */
case this.case_DIV:
            yych = this._charAt(cursor);
            if (yych <= '9') {
                if (yych <= '(') {
                    if (yych <= '#') {
                        if (yych <= ' ') { gotoCase = 15; continue; };
                        if (yych <= '!') { gotoCase = 17; continue; };
                        if (yych <= '"') { gotoCase = 19; continue; };
                    } else {
                        if (yych <= '%') {
                            if (yych <= '$') { gotoCase = 20; continue; };
                            { gotoCase = 22; continue; };
                        } else {
                            if (yych <= '&') { gotoCase = 23; continue; };
                            if (yych <= '\'') { gotoCase = 24; continue; };
                            { gotoCase = 25; continue; };
                        }
                    }
                } else {
                    if (yych <= ',') {
                        if (yych <= ')') { gotoCase = 26; continue; };
                        if (yych <= '*') { gotoCase = 28; continue; };
                        if (yych <= '+') { gotoCase = 29; continue; };
                        { gotoCase = 25; continue; };
                    } else {
                        if (yych <= '.') {
                            if (yych <= '-') { gotoCase = 30; continue; };
                            { gotoCase = 31; continue; };
                        } else {
                            if (yych <= '/') { gotoCase = 32; continue; };
                            if (yych <= '0') { gotoCase = 34; continue; };
                            { gotoCase = 36; continue; };
                        }
                    }
                }
            } else {
                if (yych <= '\\') {
                    if (yych <= '>') {
                        if (yych <= ';') { gotoCase = 25; continue; };
                        if (yych <= '<') { gotoCase = 37; continue; };
                        if (yych <= '=') { gotoCase = 38; continue; };
                        { gotoCase = 39; continue; };
                    } else {
                        if (yych <= '@') {
                            if (yych <= '?') { gotoCase = 25; continue; };
                        } else {
                            if (yych <= 'Z') { gotoCase = 20; continue; };
                            if (yych <= '[') { gotoCase = 25; continue; };
                            { gotoCase = 40; continue; };
                        }
                    }
                } else {
                    if (yych <= 'z') {
                        if (yych <= '^') {
                            if (yych <= ']') { gotoCase = 25; continue; };
                            { gotoCase = 41; continue; };
                        } else {
                            if (yych != '`') { gotoCase = 20; continue; };
                        }
                    } else {
                        if (yych <= '|') {
                            if (yych <= '{') { gotoCase = 25; continue; };
                            { gotoCase = 42; continue; };
                        } else {
                            if (yych <= '~') { gotoCase = 25; continue; };
                            if (yych >= 0x80) { gotoCase = 20; continue; };
                        }
                    }
                }
            }
case 15:
            ++cursor;
case 16:
            { this.tokenType = null; return cursor; }
case 17:
            ++cursor;
            if ((yych = this._charAt(cursor)) == '=') { gotoCase = 115; continue; };
case 18:
            this.setLexCondition(this._lexConditions.NODIV);
            { this.tokenType = null; return cursor; }
case 19:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych == '\n') { gotoCase = 16; continue; };
            if (yych == '\r') { gotoCase = 16; continue; };
            { gotoCase = 107; continue; };
case 20:
            yyaccept = 1;
            yych = this._charAt(YYMARKER = ++cursor);
            { gotoCase = 50; continue; };
case 21:
            {
                    var token = this._line.substring(cursorOnEnter, cursor);
                    if (this._keywords[token] === true && token !== "__proto__")
                        this.tokenType = "javascript-keyword";
                    else
                        this.tokenType = "javascript-ident";
                    return cursor;
                }
case 22:
            yych = this._charAt(++cursor);
            if (yych == '=') { gotoCase = 43; continue; };
            { gotoCase = 18; continue; };
case 23:
            yych = this._charAt(++cursor);
            if (yych == '&') { gotoCase = 43; continue; };
            if (yych == '=') { gotoCase = 43; continue; };
            { gotoCase = 18; continue; };
case 24:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych == '\n') { gotoCase = 16; continue; };
            if (yych == '\r') { gotoCase = 16; continue; };
            { gotoCase = 96; continue; };
case 25:
            yych = this._charAt(++cursor);
            { gotoCase = 18; continue; };
case 26:
            ++cursor;
            { this.tokenType = null; return cursor; }
case 28:
            yych = this._charAt(++cursor);
            if (yych == '=') { gotoCase = 43; continue; };
            { gotoCase = 18; continue; };
case 29:
            yych = this._charAt(++cursor);
            if (yych == '+') { gotoCase = 43; continue; };
            if (yych == '=') { gotoCase = 43; continue; };
            { gotoCase = 18; continue; };
case 30:
            yych = this._charAt(++cursor);
            if (yych == '-') { gotoCase = 43; continue; };
            if (yych == '=') { gotoCase = 43; continue; };
            { gotoCase = 18; continue; };
case 31:
            yych = this._charAt(++cursor);
            if (yych <= '/') { gotoCase = 18; continue; };
            if (yych <= '9') { gotoCase = 89; continue; };
            { gotoCase = 18; continue; };
case 32:
            yyaccept = 2;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych <= '.') {
                if (yych == '*') { gotoCase = 78; continue; };
            } else {
                if (yych <= '/') { gotoCase = 80; continue; };
                if (yych == '=') { gotoCase = 77; continue; };
            }
case 33:
            this.setLexCondition(this._lexConditions.NODIV);
            { this.tokenType = null; return cursor; }
case 34:
            yyaccept = 3;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych <= 'E') {
                if (yych <= '/') {
                    if (yych == '.') { gotoCase = 63; continue; };
                } else {
                    if (yych <= '7') { gotoCase = 72; continue; };
                    if (yych >= 'E') { gotoCase = 62; continue; };
                }
            } else {
                if (yych <= 'd') {
                    if (yych == 'X') { gotoCase = 74; continue; };
                } else {
                    if (yych <= 'e') { gotoCase = 62; continue; };
                    if (yych == 'x') { gotoCase = 74; continue; };
                }
            }
case 35:
            { this.tokenType = "javascript-number"; return cursor; }
case 36:
            yyaccept = 3;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych <= '9') {
                if (yych == '.') { gotoCase = 63; continue; };
                if (yych <= '/') { gotoCase = 35; continue; };
                { gotoCase = 60; continue; };
            } else {
                if (yych <= 'E') {
                    if (yych <= 'D') { gotoCase = 35; continue; };
                    { gotoCase = 62; continue; };
                } else {
                    if (yych == 'e') { gotoCase = 62; continue; };
                    { gotoCase = 35; continue; };
                }
            }
case 37:
            yych = this._charAt(++cursor);
            if (yych <= ';') { gotoCase = 18; continue; };
            if (yych <= '<') { gotoCase = 59; continue; };
            if (yych <= '=') { gotoCase = 43; continue; };
            { gotoCase = 18; continue; };
case 38:
            yych = this._charAt(++cursor);
            if (yych == '=') { gotoCase = 58; continue; };
            { gotoCase = 18; continue; };
case 39:
            yych = this._charAt(++cursor);
            if (yych <= '<') { gotoCase = 18; continue; };
            if (yych <= '=') { gotoCase = 43; continue; };
            if (yych <= '>') { gotoCase = 56; continue; };
            { gotoCase = 18; continue; };
case 40:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych == 'u') { gotoCase = 44; continue; };
            { gotoCase = 16; continue; };
case 41:
            yych = this._charAt(++cursor);
            if (yych == '=') { gotoCase = 43; continue; };
            { gotoCase = 18; continue; };
case 42:
            yych = this._charAt(++cursor);
            if (yych == '=') { gotoCase = 43; continue; };
            if (yych != '|') { gotoCase = 18; continue; };
case 43:
            yych = this._charAt(++cursor);
            { gotoCase = 18; continue; };
case 44:
            yych = this._charAt(++cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 45; continue; };
                if (yych <= '9') { gotoCase = 46; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 46; continue; };
                if (yych <= '`') { gotoCase = 45; continue; };
                if (yych <= 'f') { gotoCase = 46; continue; };
            }
case 45:
            cursor = YYMARKER;
            if (yyaccept <= 1) {
                if (yyaccept <= 0) {
                    { gotoCase = 16; continue; };
                } else {
                    { gotoCase = 21; continue; };
                }
            } else {
                if (yyaccept <= 2) {
                    { gotoCase = 33; continue; };
                } else {
                    { gotoCase = 35; continue; };
                }
            }
case 46:
            yych = this._charAt(++cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 45; continue; };
                if (yych >= ':') { gotoCase = 45; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 47; continue; };
                if (yych <= '`') { gotoCase = 45; continue; };
                if (yych >= 'g') { gotoCase = 45; continue; };
            }
case 47:
            yych = this._charAt(++cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 45; continue; };
                if (yych >= ':') { gotoCase = 45; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 48; continue; };
                if (yych <= '`') { gotoCase = 45; continue; };
                if (yych >= 'g') { gotoCase = 45; continue; };
            }
case 48:
            yych = this._charAt(++cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 45; continue; };
                if (yych >= ':') { gotoCase = 45; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 49; continue; };
                if (yych <= '`') { gotoCase = 45; continue; };
                if (yych >= 'g') { gotoCase = 45; continue; };
            }
case 49:
            yyaccept = 1;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
case 50:
            if (yych <= '[') {
                if (yych <= '/') {
                    if (yych == '$') { gotoCase = 49; continue; };
                    { gotoCase = 21; continue; };
                } else {
                    if (yych <= '9') { gotoCase = 49; continue; };
                    if (yych <= '@') { gotoCase = 21; continue; };
                    if (yych <= 'Z') { gotoCase = 49; continue; };
                    { gotoCase = 21; continue; };
                }
            } else {
                if (yych <= '_') {
                    if (yych <= '\\') { gotoCase = 51; continue; };
                    if (yych <= '^') { gotoCase = 21; continue; };
                    { gotoCase = 49; continue; };
                } else {
                    if (yych <= '`') { gotoCase = 21; continue; };
                    if (yych <= 'z') { gotoCase = 49; continue; };
                    if (yych <= String.fromCharCode(0x7F)) { gotoCase = 21; continue; };
                    { gotoCase = 49; continue; };
                }
            }
case 51:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych != 'u') { gotoCase = 45; continue; };
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 45; continue; };
                if (yych >= ':') { gotoCase = 45; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 53; continue; };
                if (yych <= '`') { gotoCase = 45; continue; };
                if (yych >= 'g') { gotoCase = 45; continue; };
            }
case 53:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 45; continue; };
                if (yych >= ':') { gotoCase = 45; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 54; continue; };
                if (yych <= '`') { gotoCase = 45; continue; };
                if (yych >= 'g') { gotoCase = 45; continue; };
            }
case 54:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 45; continue; };
                if (yych >= ':') { gotoCase = 45; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 55; continue; };
                if (yych <= '`') { gotoCase = 45; continue; };
                if (yych >= 'g') { gotoCase = 45; continue; };
            }
case 55:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 45; continue; };
                if (yych <= '9') { gotoCase = 49; continue; };
                { gotoCase = 45; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 49; continue; };
                if (yych <= '`') { gotoCase = 45; continue; };
                if (yych <= 'f') { gotoCase = 49; continue; };
                { gotoCase = 45; continue; };
            }
case 56:
            yych = this._charAt(++cursor);
            if (yych <= '<') { gotoCase = 18; continue; };
            if (yych <= '=') { gotoCase = 43; continue; };
            if (yych >= '?') { gotoCase = 18; continue; };
            yych = this._charAt(++cursor);
            if (yych == '=') { gotoCase = 43; continue; };
            { gotoCase = 18; continue; };
case 58:
            yych = this._charAt(++cursor);
            if (yych == '=') { gotoCase = 43; continue; };
            { gotoCase = 18; continue; };
case 59:
            yych = this._charAt(++cursor);
            if (yych == '=') { gotoCase = 43; continue; };
            { gotoCase = 18; continue; };
case 60:
            yyaccept = 3;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '9') {
                if (yych == '.') { gotoCase = 63; continue; };
                if (yych <= '/') { gotoCase = 35; continue; };
                { gotoCase = 60; continue; };
            } else {
                if (yych <= 'E') {
                    if (yych <= 'D') { gotoCase = 35; continue; };
                } else {
                    if (yych != 'e') { gotoCase = 35; continue; };
                }
            }
case 62:
            yych = this._charAt(++cursor);
            if (yych <= ',') {
                if (yych == '+') { gotoCase = 69; continue; };
                { gotoCase = 45; continue; };
            } else {
                if (yych <= '-') { gotoCase = 69; continue; };
                if (yych <= '/') { gotoCase = 45; continue; };
                if (yych <= '9') { gotoCase = 70; continue; };
                { gotoCase = 45; continue; };
            }
case 63:
            yyaccept = 3;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
            if (yych <= 'D') {
                if (yych <= '/') { gotoCase = 35; continue; };
                if (yych <= '9') { gotoCase = 63; continue; };
                { gotoCase = 35; continue; };
            } else {
                if (yych <= 'E') { gotoCase = 65; continue; };
                if (yych != 'e') { gotoCase = 35; continue; };
            }
case 65:
            yych = this._charAt(++cursor);
            if (yych <= ',') {
                if (yych != '+') { gotoCase = 45; continue; };
            } else {
                if (yych <= '-') { gotoCase = 66; continue; };
                if (yych <= '/') { gotoCase = 45; continue; };
                if (yych <= '9') { gotoCase = 67; continue; };
                { gotoCase = 45; continue; };
            }
case 66:
            yych = this._charAt(++cursor);
            if (yych <= '/') { gotoCase = 45; continue; };
            if (yych >= ':') { gotoCase = 45; continue; };
case 67:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '/') { gotoCase = 35; continue; };
            if (yych <= '9') { gotoCase = 67; continue; };
            { gotoCase = 35; continue; };
case 69:
            yych = this._charAt(++cursor);
            if (yych <= '/') { gotoCase = 45; continue; };
            if (yych >= ':') { gotoCase = 45; continue; };
case 70:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '/') { gotoCase = 35; continue; };
            if (yych <= '9') { gotoCase = 70; continue; };
            { gotoCase = 35; continue; };
case 72:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '/') { gotoCase = 35; continue; };
            if (yych <= '7') { gotoCase = 72; continue; };
            { gotoCase = 35; continue; };
case 74:
            yych = this._charAt(++cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 45; continue; };
                if (yych >= ':') { gotoCase = 45; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 75; continue; };
                if (yych <= '`') { gotoCase = 45; continue; };
                if (yych >= 'g') { gotoCase = 45; continue; };
            }
case 75:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 35; continue; };
                if (yych <= '9') { gotoCase = 75; continue; };
                { gotoCase = 35; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 75; continue; };
                if (yych <= '`') { gotoCase = 35; continue; };
                if (yych <= 'f') { gotoCase = 75; continue; };
                { gotoCase = 35; continue; };
            }
case 77:
            yych = this._charAt(++cursor);
            { gotoCase = 33; continue; };
case 78:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '\f') {
                if (yych == '\n') { gotoCase = 85; continue; };
                { gotoCase = 78; continue; };
            } else {
                if (yych <= '\r') { gotoCase = 85; continue; };
                if (yych == '*') { gotoCase = 83; continue; };
                { gotoCase = 78; continue; };
            }
case 80:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych == '\n') { gotoCase = 82; continue; };
            if (yych != '\r') { gotoCase = 80; continue; };
case 82:
            { this.tokenType = "javascript-comment"; return cursor; }
case 83:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych == '*') { gotoCase = 83; continue; };
            if (yych == '/') { gotoCase = 87; continue; };
            { gotoCase = 78; continue; };
case 85:
            ++cursor;
            this.setLexCondition(this._lexConditions.COMMENT);
            { this.tokenType = "javascript-comment"; return cursor; }
case 87:
            ++cursor;
            { this.tokenType = "javascript-comment"; return cursor; }
case 89:
            yyaccept = 3;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
            if (yych <= 'D') {
                if (yych <= '/') { gotoCase = 35; continue; };
                if (yych <= '9') { gotoCase = 89; continue; };
                { gotoCase = 35; continue; };
            } else {
                if (yych <= 'E') { gotoCase = 91; continue; };
                if (yych != 'e') { gotoCase = 35; continue; };
            }
case 91:
            yych = this._charAt(++cursor);
            if (yych <= ',') {
                if (yych != '+') { gotoCase = 45; continue; };
            } else {
                if (yych <= '-') { gotoCase = 92; continue; };
                if (yych <= '/') { gotoCase = 45; continue; };
                if (yych <= '9') { gotoCase = 93; continue; };
                { gotoCase = 45; continue; };
            }
case 92:
            yych = this._charAt(++cursor);
            if (yych <= '/') { gotoCase = 45; continue; };
            if (yych >= ':') { gotoCase = 45; continue; };
case 93:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '/') { gotoCase = 35; continue; };
            if (yych <= '9') { gotoCase = 93; continue; };
            { gotoCase = 35; continue; };
case 95:
            ++cursor;
            yych = this._charAt(cursor);
case 96:
            if (yych <= '\r') {
                if (yych == '\n') { gotoCase = 45; continue; };
                if (yych <= '\f') { gotoCase = 95; continue; };
                { gotoCase = 45; continue; };
            } else {
                if (yych <= '\'') {
                    if (yych <= '&') { gotoCase = 95; continue; };
                    { gotoCase = 98; continue; };
                } else {
                    if (yych != '\\') { gotoCase = 95; continue; };
                }
            }
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= 'a') {
                if (yych <= '!') {
                    if (yych <= '\n') {
                        if (yych <= '\t') { gotoCase = 45; continue; };
                        { gotoCase = 101; continue; };
                    } else {
                        if (yych == '\r') { gotoCase = 101; continue; };
                        { gotoCase = 45; continue; };
                    }
                } else {
                    if (yych <= '\'') {
                        if (yych <= '"') { gotoCase = 95; continue; };
                        if (yych <= '&') { gotoCase = 45; continue; };
                        { gotoCase = 95; continue; };
                    } else {
                        if (yych == '\\') { gotoCase = 95; continue; };
                        { gotoCase = 45; continue; };
                    }
                }
            } else {
                if (yych <= 'q') {
                    if (yych <= 'f') {
                        if (yych <= 'b') { gotoCase = 95; continue; };
                        if (yych <= 'e') { gotoCase = 45; continue; };
                        { gotoCase = 95; continue; };
                    } else {
                        if (yych == 'n') { gotoCase = 95; continue; };
                        { gotoCase = 45; continue; };
                    }
                } else {
                    if (yych <= 't') {
                        if (yych == 's') { gotoCase = 45; continue; };
                        { gotoCase = 95; continue; };
                    } else {
                        if (yych <= 'u') { gotoCase = 100; continue; };
                        if (yych <= 'v') { gotoCase = 95; continue; };
                        { gotoCase = 45; continue; };
                    }
                }
            }
case 98:
            ++cursor;
            { this.tokenType = "javascript-string"; return cursor; }
case 100:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 45; continue; };
                if (yych <= '9') { gotoCase = 103; continue; };
                { gotoCase = 45; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 103; continue; };
                if (yych <= '`') { gotoCase = 45; continue; };
                if (yych <= 'f') { gotoCase = 103; continue; };
                { gotoCase = 45; continue; };
            }
case 101:
            ++cursor;
            this.setLexCondition(this._lexConditions.SSTRING);
            { this.tokenType = "javascript-string"; return cursor; }
case 103:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 45; continue; };
                if (yych >= ':') { gotoCase = 45; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 104; continue; };
                if (yych <= '`') { gotoCase = 45; continue; };
                if (yych >= 'g') { gotoCase = 45; continue; };
            }
case 104:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 45; continue; };
                if (yych >= ':') { gotoCase = 45; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 105; continue; };
                if (yych <= '`') { gotoCase = 45; continue; };
                if (yych >= 'g') { gotoCase = 45; continue; };
            }
case 105:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 45; continue; };
                if (yych <= '9') { gotoCase = 95; continue; };
                { gotoCase = 45; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 95; continue; };
                if (yych <= '`') { gotoCase = 45; continue; };
                if (yych <= 'f') { gotoCase = 95; continue; };
                { gotoCase = 45; continue; };
            }
case 106:
            ++cursor;
            yych = this._charAt(cursor);
case 107:
            if (yych <= '\r') {
                if (yych == '\n') { gotoCase = 45; continue; };
                if (yych <= '\f') { gotoCase = 106; continue; };
                { gotoCase = 45; continue; };
            } else {
                if (yych <= '"') {
                    if (yych <= '!') { gotoCase = 106; continue; };
                    { gotoCase = 98; continue; };
                } else {
                    if (yych != '\\') { gotoCase = 106; continue; };
                }
            }
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= 'a') {
                if (yych <= '!') {
                    if (yych <= '\n') {
                        if (yych <= '\t') { gotoCase = 45; continue; };
                        { gotoCase = 110; continue; };
                    } else {
                        if (yych == '\r') { gotoCase = 110; continue; };
                        { gotoCase = 45; continue; };
                    }
                } else {
                    if (yych <= '\'') {
                        if (yych <= '"') { gotoCase = 106; continue; };
                        if (yych <= '&') { gotoCase = 45; continue; };
                        { gotoCase = 106; continue; };
                    } else {
                        if (yych == '\\') { gotoCase = 106; continue; };
                        { gotoCase = 45; continue; };
                    }
                }
            } else {
                if (yych <= 'q') {
                    if (yych <= 'f') {
                        if (yych <= 'b') { gotoCase = 106; continue; };
                        if (yych <= 'e') { gotoCase = 45; continue; };
                        { gotoCase = 106; continue; };
                    } else {
                        if (yych == 'n') { gotoCase = 106; continue; };
                        { gotoCase = 45; continue; };
                    }
                } else {
                    if (yych <= 't') {
                        if (yych == 's') { gotoCase = 45; continue; };
                        { gotoCase = 106; continue; };
                    } else {
                        if (yych <= 'u') { gotoCase = 109; continue; };
                        if (yych <= 'v') { gotoCase = 106; continue; };
                        { gotoCase = 45; continue; };
                    }
                }
            }
case 109:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 45; continue; };
                if (yych <= '9') { gotoCase = 112; continue; };
                { gotoCase = 45; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 112; continue; };
                if (yych <= '`') { gotoCase = 45; continue; };
                if (yych <= 'f') { gotoCase = 112; continue; };
                { gotoCase = 45; continue; };
            }
case 110:
            ++cursor;
            this.setLexCondition(this._lexConditions.DSTRING);
            { this.tokenType = "javascript-string"; return cursor; }
case 112:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 45; continue; };
                if (yych >= ':') { gotoCase = 45; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 113; continue; };
                if (yych <= '`') { gotoCase = 45; continue; };
                if (yych >= 'g') { gotoCase = 45; continue; };
            }
case 113:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 45; continue; };
                if (yych >= ':') { gotoCase = 45; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 114; continue; };
                if (yych <= '`') { gotoCase = 45; continue; };
                if (yych >= 'g') { gotoCase = 45; continue; };
            }
case 114:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 45; continue; };
                if (yych <= '9') { gotoCase = 106; continue; };
                { gotoCase = 45; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 106; continue; };
                if (yych <= '`') { gotoCase = 45; continue; };
                if (yych <= 'f') { gotoCase = 106; continue; };
                { gotoCase = 45; continue; };
            }
case 115:
            ++cursor;
            if ((yych = this._charAt(cursor)) == '=') { gotoCase = 43; continue; };
            { gotoCase = 18; continue; };
/* *********************************** */
case this.case_DSTRING:
            yych = this._charAt(cursor);
            if (yych <= '\r') {
                if (yych == '\n') { gotoCase = 120; continue; };
                if (yych <= '\f') { gotoCase = 119; continue; };
                { gotoCase = 120; continue; };
            } else {
                if (yych <= '"') {
                    if (yych <= '!') { gotoCase = 119; continue; };
                    { gotoCase = 122; continue; };
                } else {
                    if (yych == '\\') { gotoCase = 124; continue; };
                    { gotoCase = 119; continue; };
                }
            }
case 118:
            { this.tokenType = "javascript-string"; return cursor; }
case 119:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            { gotoCase = 126; continue; };
case 120:
            ++cursor;
case 121:
            { this.tokenType = null; return cursor; }
case 122:
            ++cursor;
case 123:
            this.setLexCondition(this._lexConditions.NODIV);
            { this.tokenType = "javascript-string"; return cursor; }
case 124:
            yyaccept = 1;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych <= 'e') {
                if (yych <= '\'') {
                    if (yych == '"') { gotoCase = 125; continue; };
                    if (yych <= '&') { gotoCase = 121; continue; };
                } else {
                    if (yych <= '\\') {
                        if (yych <= '[') { gotoCase = 121; continue; };
                    } else {
                        if (yych != 'b') { gotoCase = 121; continue; };
                    }
                }
            } else {
                if (yych <= 'r') {
                    if (yych <= 'm') {
                        if (yych >= 'g') { gotoCase = 121; continue; };
                    } else {
                        if (yych <= 'n') { gotoCase = 125; continue; };
                        if (yych <= 'q') { gotoCase = 121; continue; };
                    }
                } else {
                    if (yych <= 't') {
                        if (yych <= 's') { gotoCase = 121; continue; };
                    } else {
                        if (yych <= 'u') { gotoCase = 127; continue; };
                        if (yych >= 'w') { gotoCase = 121; continue; };
                    }
                }
            }
case 125:
            yyaccept = 0;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
case 126:
            if (yych <= '\r') {
                if (yych == '\n') { gotoCase = 118; continue; };
                if (yych <= '\f') { gotoCase = 125; continue; };
                { gotoCase = 118; continue; };
            } else {
                if (yych <= '"') {
                    if (yych <= '!') { gotoCase = 125; continue; };
                    { gotoCase = 133; continue; };
                } else {
                    if (yych == '\\') { gotoCase = 132; continue; };
                    { gotoCase = 125; continue; };
                }
            }
case 127:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 128; continue; };
                if (yych <= '9') { gotoCase = 129; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 129; continue; };
                if (yych <= '`') { gotoCase = 128; continue; };
                if (yych <= 'f') { gotoCase = 129; continue; };
            }
case 128:
            cursor = YYMARKER;
            if (yyaccept <= 0) {
                { gotoCase = 118; continue; };
            } else {
                { gotoCase = 121; continue; };
            }
case 129:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 128; continue; };
                if (yych >= ':') { gotoCase = 128; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 130; continue; };
                if (yych <= '`') { gotoCase = 128; continue; };
                if (yych >= 'g') { gotoCase = 128; continue; };
            }
case 130:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 128; continue; };
                if (yych >= ':') { gotoCase = 128; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 131; continue; };
                if (yych <= '`') { gotoCase = 128; continue; };
                if (yych >= 'g') { gotoCase = 128; continue; };
            }
case 131:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 128; continue; };
                if (yych <= '9') { gotoCase = 125; continue; };
                { gotoCase = 128; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 125; continue; };
                if (yych <= '`') { gotoCase = 128; continue; };
                if (yych <= 'f') { gotoCase = 125; continue; };
                { gotoCase = 128; continue; };
            }
case 132:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= 'e') {
                if (yych <= '\'') {
                    if (yych == '"') { gotoCase = 125; continue; };
                    if (yych <= '&') { gotoCase = 128; continue; };
                    { gotoCase = 125; continue; };
                } else {
                    if (yych <= '\\') {
                        if (yych <= '[') { gotoCase = 128; continue; };
                        { gotoCase = 125; continue; };
                    } else {
                        if (yych == 'b') { gotoCase = 125; continue; };
                        { gotoCase = 128; continue; };
                    }
                }
            } else {
                if (yych <= 'r') {
                    if (yych <= 'm') {
                        if (yych <= 'f') { gotoCase = 125; continue; };
                        { gotoCase = 128; continue; };
                    } else {
                        if (yych <= 'n') { gotoCase = 125; continue; };
                        if (yych <= 'q') { gotoCase = 128; continue; };
                        { gotoCase = 125; continue; };
                    }
                } else {
                    if (yych <= 't') {
                        if (yych <= 's') { gotoCase = 128; continue; };
                        { gotoCase = 125; continue; };
                    } else {
                        if (yych <= 'u') { gotoCase = 127; continue; };
                        if (yych <= 'v') { gotoCase = 125; continue; };
                        { gotoCase = 128; continue; };
                    }
                }
            }
case 133:
            ++cursor;
            yych = this._charAt(cursor);
            { gotoCase = 123; continue; };
/* *********************************** */
case this.case_NODIV:
            yych = this._charAt(cursor);
            if (yych <= '9') {
                if (yych <= '(') {
                    if (yych <= '#') {
                        if (yych <= ' ') { gotoCase = 136; continue; };
                        if (yych <= '!') { gotoCase = 138; continue; };
                        if (yych <= '"') { gotoCase = 140; continue; };
                    } else {
                        if (yych <= '%') {
                            if (yych <= '$') { gotoCase = 141; continue; };
                            { gotoCase = 143; continue; };
                        } else {
                            if (yych <= '&') { gotoCase = 144; continue; };
                            if (yych <= '\'') { gotoCase = 145; continue; };
                            { gotoCase = 146; continue; };
                        }
                    }
                } else {
                    if (yych <= ',') {
                        if (yych <= ')') { gotoCase = 147; continue; };
                        if (yych <= '*') { gotoCase = 149; continue; };
                        if (yych <= '+') { gotoCase = 150; continue; };
                        { gotoCase = 146; continue; };
                    } else {
                        if (yych <= '.') {
                            if (yych <= '-') { gotoCase = 151; continue; };
                            { gotoCase = 152; continue; };
                        } else {
                            if (yych <= '/') { gotoCase = 153; continue; };
                            if (yych <= '0') { gotoCase = 154; continue; };
                            { gotoCase = 156; continue; };
                        }
                    }
                }
            } else {
                if (yych <= '\\') {
                    if (yych <= '>') {
                        if (yych <= ';') { gotoCase = 146; continue; };
                        if (yych <= '<') { gotoCase = 157; continue; };
                        if (yych <= '=') { gotoCase = 158; continue; };
                        { gotoCase = 159; continue; };
                    } else {
                        if (yych <= '@') {
                            if (yych <= '?') { gotoCase = 146; continue; };
                        } else {
                            if (yych <= 'Z') { gotoCase = 141; continue; };
                            if (yych <= '[') { gotoCase = 146; continue; };
                            { gotoCase = 160; continue; };
                        }
                    }
                } else {
                    if (yych <= 'z') {
                        if (yych <= '^') {
                            if (yych <= ']') { gotoCase = 146; continue; };
                            { gotoCase = 161; continue; };
                        } else {
                            if (yych != '`') { gotoCase = 141; continue; };
                        }
                    } else {
                        if (yych <= '|') {
                            if (yych <= '{') { gotoCase = 146; continue; };
                            { gotoCase = 162; continue; };
                        } else {
                            if (yych <= '~') { gotoCase = 146; continue; };
                            if (yych >= 0x80) { gotoCase = 141; continue; };
                        }
                    }
                }
            }
case 136:
            ++cursor;
case 137:
            { this.tokenType = null; return cursor; }
case 138:
            ++cursor;
            if ((yych = this._charAt(cursor)) == '=') { gotoCase = 260; continue; };
case 139:
            { this.tokenType = null; return cursor; }
case 140:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych == '\n') { gotoCase = 137; continue; };
            if (yych == '\r') { gotoCase = 137; continue; };
            { gotoCase = 252; continue; };
case 141:
            yyaccept = 1;
            yych = this._charAt(YYMARKER = ++cursor);
            { gotoCase = 170; continue; };
case 142:
            this.setLexCondition(this._lexConditions.DIV);
            {
                    var token = this._line.substring(cursorOnEnter, cursor);
                    if (this._keywords[token] === true && token !== "__proto__")
                        this.tokenType = "javascript-keyword";
                    else
                        this.tokenType = "javascript-ident";
                    return cursor;
                }
case 143:
            yych = this._charAt(++cursor);
            if (yych == '=') { gotoCase = 163; continue; };
            { gotoCase = 139; continue; };
case 144:
            yych = this._charAt(++cursor);
            if (yych == '&') { gotoCase = 163; continue; };
            if (yych == '=') { gotoCase = 163; continue; };
            { gotoCase = 139; continue; };
case 145:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych == '\n') { gotoCase = 137; continue; };
            if (yych == '\r') { gotoCase = 137; continue; };
            { gotoCase = 241; continue; };
case 146:
            yych = this._charAt(++cursor);
            { gotoCase = 139; continue; };
case 147:
            ++cursor;
            this.setLexCondition(this._lexConditions.DIV);
            { this.tokenType = null; return cursor; }
case 149:
            yych = this._charAt(++cursor);
            if (yych == '=') { gotoCase = 163; continue; };
            { gotoCase = 139; continue; };
case 150:
            yych = this._charAt(++cursor);
            if (yych == '+') { gotoCase = 163; continue; };
            if (yych == '=') { gotoCase = 163; continue; };
            { gotoCase = 139; continue; };
case 151:
            yych = this._charAt(++cursor);
            if (yych == '-') { gotoCase = 163; continue; };
            if (yych == '=') { gotoCase = 163; continue; };
            { gotoCase = 139; continue; };
case 152:
            yych = this._charAt(++cursor);
            if (yych <= '/') { gotoCase = 139; continue; };
            if (yych <= '9') { gotoCase = 234; continue; };
            { gotoCase = 139; continue; };
case 153:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych <= '*') {
                if (yych <= '\f') {
                    if (yych == '\n') { gotoCase = 137; continue; };
                    { gotoCase = 197; continue; };
                } else {
                    if (yych <= '\r') { gotoCase = 137; continue; };
                    if (yych <= ')') { gotoCase = 197; continue; };
                    { gotoCase = 202; continue; };
                }
            } else {
                if (yych <= 'Z') {
                    if (yych == '/') { gotoCase = 204; continue; };
                    { gotoCase = 197; continue; };
                } else {
                    if (yych <= '[') { gotoCase = 200; continue; };
                    if (yych <= '\\') { gotoCase = 199; continue; };
                    if (yych <= ']') { gotoCase = 137; continue; };
                    { gotoCase = 197; continue; };
                }
            }
case 154:
            yyaccept = 2;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych <= 'E') {
                if (yych <= '/') {
                    if (yych == '.') { gotoCase = 183; continue; };
                } else {
                    if (yych <= '7') { gotoCase = 192; continue; };
                    if (yych >= 'E') { gotoCase = 182; continue; };
                }
            } else {
                if (yych <= 'd') {
                    if (yych == 'X') { gotoCase = 194; continue; };
                } else {
                    if (yych <= 'e') { gotoCase = 182; continue; };
                    if (yych == 'x') { gotoCase = 194; continue; };
                }
            }
case 155:
            this.setLexCondition(this._lexConditions.DIV);
            { this.tokenType = "javascript-number"; return cursor; }
case 156:
            yyaccept = 2;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych <= '9') {
                if (yych == '.') { gotoCase = 183; continue; };
                if (yych <= '/') { gotoCase = 155; continue; };
                { gotoCase = 180; continue; };
            } else {
                if (yych <= 'E') {
                    if (yych <= 'D') { gotoCase = 155; continue; };
                    { gotoCase = 182; continue; };
                } else {
                    if (yych == 'e') { gotoCase = 182; continue; };
                    { gotoCase = 155; continue; };
                }
            }
case 157:
            yych = this._charAt(++cursor);
            if (yych <= ';') { gotoCase = 139; continue; };
            if (yych <= '<') { gotoCase = 179; continue; };
            if (yych <= '=') { gotoCase = 163; continue; };
            { gotoCase = 139; continue; };
case 158:
            yych = this._charAt(++cursor);
            if (yych == '=') { gotoCase = 178; continue; };
            { gotoCase = 139; continue; };
case 159:
            yych = this._charAt(++cursor);
            if (yych <= '<') { gotoCase = 139; continue; };
            if (yych <= '=') { gotoCase = 163; continue; };
            if (yych <= '>') { gotoCase = 176; continue; };
            { gotoCase = 139; continue; };
case 160:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych == 'u') { gotoCase = 164; continue; };
            { gotoCase = 137; continue; };
case 161:
            yych = this._charAt(++cursor);
            if (yych == '=') { gotoCase = 163; continue; };
            { gotoCase = 139; continue; };
case 162:
            yych = this._charAt(++cursor);
            if (yych == '=') { gotoCase = 163; continue; };
            if (yych != '|') { gotoCase = 139; continue; };
case 163:
            yych = this._charAt(++cursor);
            { gotoCase = 139; continue; };
case 164:
            yych = this._charAt(++cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 165; continue; };
                if (yych <= '9') { gotoCase = 166; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 166; continue; };
                if (yych <= '`') { gotoCase = 165; continue; };
                if (yych <= 'f') { gotoCase = 166; continue; };
            }
case 165:
            cursor = YYMARKER;
            if (yyaccept <= 1) {
                if (yyaccept <= 0) {
                    { gotoCase = 137; continue; };
                } else {
                    { gotoCase = 142; continue; };
                }
            } else {
                if (yyaccept <= 2) {
                    { gotoCase = 155; continue; };
                } else {
                    { gotoCase = 217; continue; };
                }
            }
case 166:
            yych = this._charAt(++cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 165; continue; };
                if (yych >= ':') { gotoCase = 165; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 167; continue; };
                if (yych <= '`') { gotoCase = 165; continue; };
                if (yych >= 'g') { gotoCase = 165; continue; };
            }
case 167:
            yych = this._charAt(++cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 165; continue; };
                if (yych >= ':') { gotoCase = 165; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 168; continue; };
                if (yych <= '`') { gotoCase = 165; continue; };
                if (yych >= 'g') { gotoCase = 165; continue; };
            }
case 168:
            yych = this._charAt(++cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 165; continue; };
                if (yych >= ':') { gotoCase = 165; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 169; continue; };
                if (yych <= '`') { gotoCase = 165; continue; };
                if (yych >= 'g') { gotoCase = 165; continue; };
            }
case 169:
            yyaccept = 1;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
case 170:
            if (yych <= '[') {
                if (yych <= '/') {
                    if (yych == '$') { gotoCase = 169; continue; };
                    { gotoCase = 142; continue; };
                } else {
                    if (yych <= '9') { gotoCase = 169; continue; };
                    if (yych <= '@') { gotoCase = 142; continue; };
                    if (yych <= 'Z') { gotoCase = 169; continue; };
                    { gotoCase = 142; continue; };
                }
            } else {
                if (yych <= '_') {
                    if (yych <= '\\') { gotoCase = 171; continue; };
                    if (yych <= '^') { gotoCase = 142; continue; };
                    { gotoCase = 169; continue; };
                } else {
                    if (yych <= '`') { gotoCase = 142; continue; };
                    if (yych <= 'z') { gotoCase = 169; continue; };
                    if (yych <= String.fromCharCode(0x7F)) { gotoCase = 142; continue; };
                    { gotoCase = 169; continue; };
                }
            }
case 171:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych != 'u') { gotoCase = 165; continue; };
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 165; continue; };
                if (yych >= ':') { gotoCase = 165; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 173; continue; };
                if (yych <= '`') { gotoCase = 165; continue; };
                if (yych >= 'g') { gotoCase = 165; continue; };
            }
case 173:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 165; continue; };
                if (yych >= ':') { gotoCase = 165; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 174; continue; };
                if (yych <= '`') { gotoCase = 165; continue; };
                if (yych >= 'g') { gotoCase = 165; continue; };
            }
case 174:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 165; continue; };
                if (yych >= ':') { gotoCase = 165; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 175; continue; };
                if (yych <= '`') { gotoCase = 165; continue; };
                if (yych >= 'g') { gotoCase = 165; continue; };
            }
case 175:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 165; continue; };
                if (yych <= '9') { gotoCase = 169; continue; };
                { gotoCase = 165; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 169; continue; };
                if (yych <= '`') { gotoCase = 165; continue; };
                if (yych <= 'f') { gotoCase = 169; continue; };
                { gotoCase = 165; continue; };
            }
case 176:
            yych = this._charAt(++cursor);
            if (yych <= '<') { gotoCase = 139; continue; };
            if (yych <= '=') { gotoCase = 163; continue; };
            if (yych >= '?') { gotoCase = 139; continue; };
            yych = this._charAt(++cursor);
            if (yych == '=') { gotoCase = 163; continue; };
            { gotoCase = 139; continue; };
case 178:
            yych = this._charAt(++cursor);
            if (yych == '=') { gotoCase = 163; continue; };
            { gotoCase = 139; continue; };
case 179:
            yych = this._charAt(++cursor);
            if (yych == '=') { gotoCase = 163; continue; };
            { gotoCase = 139; continue; };
case 180:
            yyaccept = 2;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '9') {
                if (yych == '.') { gotoCase = 183; continue; };
                if (yych <= '/') { gotoCase = 155; continue; };
                { gotoCase = 180; continue; };
            } else {
                if (yych <= 'E') {
                    if (yych <= 'D') { gotoCase = 155; continue; };
                } else {
                    if (yych != 'e') { gotoCase = 155; continue; };
                }
            }
case 182:
            yych = this._charAt(++cursor);
            if (yych <= ',') {
                if (yych == '+') { gotoCase = 189; continue; };
                { gotoCase = 165; continue; };
            } else {
                if (yych <= '-') { gotoCase = 189; continue; };
                if (yych <= '/') { gotoCase = 165; continue; };
                if (yych <= '9') { gotoCase = 190; continue; };
                { gotoCase = 165; continue; };
            }
case 183:
            yyaccept = 2;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
            if (yych <= 'D') {
                if (yych <= '/') { gotoCase = 155; continue; };
                if (yych <= '9') { gotoCase = 183; continue; };
                { gotoCase = 155; continue; };
            } else {
                if (yych <= 'E') { gotoCase = 185; continue; };
                if (yych != 'e') { gotoCase = 155; continue; };
            }
case 185:
            yych = this._charAt(++cursor);
            if (yych <= ',') {
                if (yych != '+') { gotoCase = 165; continue; };
            } else {
                if (yych <= '-') { gotoCase = 186; continue; };
                if (yych <= '/') { gotoCase = 165; continue; };
                if (yych <= '9') { gotoCase = 187; continue; };
                { gotoCase = 165; continue; };
            }
case 186:
            yych = this._charAt(++cursor);
            if (yych <= '/') { gotoCase = 165; continue; };
            if (yych >= ':') { gotoCase = 165; continue; };
case 187:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '/') { gotoCase = 155; continue; };
            if (yych <= '9') { gotoCase = 187; continue; };
            { gotoCase = 155; continue; };
case 189:
            yych = this._charAt(++cursor);
            if (yych <= '/') { gotoCase = 165; continue; };
            if (yych >= ':') { gotoCase = 165; continue; };
case 190:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '/') { gotoCase = 155; continue; };
            if (yych <= '9') { gotoCase = 190; continue; };
            { gotoCase = 155; continue; };
case 192:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '/') { gotoCase = 155; continue; };
            if (yych <= '7') { gotoCase = 192; continue; };
            { gotoCase = 155; continue; };
case 194:
            yych = this._charAt(++cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 165; continue; };
                if (yych >= ':') { gotoCase = 165; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 195; continue; };
                if (yych <= '`') { gotoCase = 165; continue; };
                if (yych >= 'g') { gotoCase = 165; continue; };
            }
case 195:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 155; continue; };
                if (yych <= '9') { gotoCase = 195; continue; };
                { gotoCase = 155; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 195; continue; };
                if (yych <= '`') { gotoCase = 155; continue; };
                if (yych <= 'f') { gotoCase = 195; continue; };
                { gotoCase = 155; continue; };
            }
case 197:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '.') {
                if (yych <= '\n') {
                    if (yych <= '\t') { gotoCase = 197; continue; };
                    { gotoCase = 165; continue; };
                } else {
                    if (yych == '\r') { gotoCase = 165; continue; };
                    { gotoCase = 197; continue; };
                }
            } else {
                if (yych <= '[') {
                    if (yych <= '/') { gotoCase = 220; continue; };
                    if (yych <= 'Z') { gotoCase = 197; continue; };
                    { gotoCase = 228; continue; };
                } else {
                    if (yych <= '\\') { gotoCase = 227; continue; };
                    if (yych <= ']') { gotoCase = 165; continue; };
                    { gotoCase = 197; continue; };
                }
            }
case 199:
            yych = this._charAt(++cursor);
            if (yych == '\n') { gotoCase = 165; continue; };
            if (yych == '\r') { gotoCase = 165; continue; };
            { gotoCase = 197; continue; };
case 200:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '*') {
                if (yych <= '\f') {
                    if (yych == '\n') { gotoCase = 165; continue; };
                    { gotoCase = 200; continue; };
                } else {
                    if (yych <= '\r') { gotoCase = 165; continue; };
                    if (yych <= ')') { gotoCase = 200; continue; };
                    { gotoCase = 165; continue; };
                }
            } else {
                if (yych <= '[') {
                    if (yych == '/') { gotoCase = 165; continue; };
                    { gotoCase = 200; continue; };
                } else {
                    if (yych <= '\\') { gotoCase = 215; continue; };
                    if (yych <= ']') { gotoCase = 213; continue; };
                    { gotoCase = 200; continue; };
                }
            }
case 202:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '\f') {
                if (yych == '\n') { gotoCase = 209; continue; };
                { gotoCase = 202; continue; };
            } else {
                if (yych <= '\r') { gotoCase = 209; continue; };
                if (yych == '*') { gotoCase = 207; continue; };
                { gotoCase = 202; continue; };
            }
case 204:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych == '\n') { gotoCase = 206; continue; };
            if (yych != '\r') { gotoCase = 204; continue; };
case 206:
            { this.tokenType = "javascript-comment"; return cursor; }
case 207:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych == '*') { gotoCase = 207; continue; };
            if (yych == '/') { gotoCase = 211; continue; };
            { gotoCase = 202; continue; };
case 209:
            ++cursor;
            this.setLexCondition(this._lexConditions.COMMENT);
            { this.tokenType = "javascript-comment"; return cursor; }
case 211:
            ++cursor;
            { this.tokenType = "javascript-comment"; return cursor; }
case 213:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '*') {
                if (yych <= '\f') {
                    if (yych == '\n') { gotoCase = 165; continue; };
                    { gotoCase = 213; continue; };
                } else {
                    if (yych <= '\r') { gotoCase = 165; continue; };
                    if (yych <= ')') { gotoCase = 213; continue; };
                    { gotoCase = 197; continue; };
                }
            } else {
                if (yych <= 'Z') {
                    if (yych == '/') { gotoCase = 220; continue; };
                    { gotoCase = 213; continue; };
                } else {
                    if (yych <= '[') { gotoCase = 218; continue; };
                    if (yych <= '\\') { gotoCase = 216; continue; };
                    { gotoCase = 213; continue; };
                }
            }
case 215:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych == '\n') { gotoCase = 165; continue; };
            if (yych == '\r') { gotoCase = 165; continue; };
            { gotoCase = 200; continue; };
case 216:
            yyaccept = 3;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
            if (yych == '\n') { gotoCase = 217; continue; };
            if (yych != '\r') { gotoCase = 213; continue; };
case 217:
            this.setLexCondition(this._lexConditions.REGEX);
            { this.tokenType = "javascript-regexp"; return cursor; }
case 218:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '*') {
                if (yych <= '\f') {
                    if (yych == '\n') { gotoCase = 165; continue; };
                    { gotoCase = 218; continue; };
                } else {
                    if (yych <= '\r') { gotoCase = 165; continue; };
                    if (yych <= ')') { gotoCase = 218; continue; };
                    { gotoCase = 165; continue; };
                }
            } else {
                if (yych <= '[') {
                    if (yych == '/') { gotoCase = 165; continue; };
                    { gotoCase = 218; continue; };
                } else {
                    if (yych <= '\\') { gotoCase = 225; continue; };
                    if (yych <= ']') { gotoCase = 223; continue; };
                    { gotoCase = 218; continue; };
                }
            }
case 220:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= 'h') {
                if (yych == 'g') { gotoCase = 220; continue; };
            } else {
                if (yych <= 'i') { gotoCase = 220; continue; };
                if (yych == 'm') { gotoCase = 220; continue; };
            }
            { this.tokenType = "javascript-regexp"; return cursor; }
case 223:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '*') {
                if (yych <= '\f') {
                    if (yych == '\n') { gotoCase = 165; continue; };
                    { gotoCase = 223; continue; };
                } else {
                    if (yych <= '\r') { gotoCase = 165; continue; };
                    if (yych <= ')') { gotoCase = 223; continue; };
                    { gotoCase = 197; continue; };
                }
            } else {
                if (yych <= 'Z') {
                    if (yych == '/') { gotoCase = 220; continue; };
                    { gotoCase = 223; continue; };
                } else {
                    if (yych <= '[') { gotoCase = 218; continue; };
                    if (yych <= '\\') { gotoCase = 226; continue; };
                    { gotoCase = 223; continue; };
                }
            }
case 225:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych == '\n') { gotoCase = 165; continue; };
            if (yych == '\r') { gotoCase = 165; continue; };
            { gotoCase = 218; continue; };
case 226:
            yyaccept = 3;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
            if (yych == '\n') { gotoCase = 217; continue; };
            if (yych == '\r') { gotoCase = 217; continue; };
            { gotoCase = 223; continue; };
case 227:
            yyaccept = 3;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
            if (yych == '\n') { gotoCase = 217; continue; };
            if (yych == '\r') { gotoCase = 217; continue; };
            { gotoCase = 197; continue; };
case 228:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '*') {
                if (yych <= '\f') {
                    if (yych == '\n') { gotoCase = 165; continue; };
                    { gotoCase = 228; continue; };
                } else {
                    if (yych <= '\r') { gotoCase = 165; continue; };
                    if (yych <= ')') { gotoCase = 228; continue; };
                    { gotoCase = 165; continue; };
                }
            } else {
                if (yych <= '[') {
                    if (yych == '/') { gotoCase = 165; continue; };
                    { gotoCase = 228; continue; };
                } else {
                    if (yych <= '\\') { gotoCase = 232; continue; };
                    if (yych >= '^') { gotoCase = 228; continue; };
                }
            }
case 230:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '*') {
                if (yych <= '\f') {
                    if (yych == '\n') { gotoCase = 165; continue; };
                    { gotoCase = 230; continue; };
                } else {
                    if (yych <= '\r') { gotoCase = 165; continue; };
                    if (yych <= ')') { gotoCase = 230; continue; };
                    { gotoCase = 197; continue; };
                }
            } else {
                if (yych <= 'Z') {
                    if (yych == '/') { gotoCase = 220; continue; };
                    { gotoCase = 230; continue; };
                } else {
                    if (yych <= '[') { gotoCase = 228; continue; };
                    if (yych <= '\\') { gotoCase = 233; continue; };
                    { gotoCase = 230; continue; };
                }
            }
case 232:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych == '\n') { gotoCase = 165; continue; };
            if (yych == '\r') { gotoCase = 165; continue; };
            { gotoCase = 228; continue; };
case 233:
            yyaccept = 3;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
            if (yych == '\n') { gotoCase = 217; continue; };
            if (yych == '\r') { gotoCase = 217; continue; };
            { gotoCase = 230; continue; };
case 234:
            yyaccept = 2;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
            if (yych <= 'D') {
                if (yych <= '/') { gotoCase = 155; continue; };
                if (yych <= '9') { gotoCase = 234; continue; };
                { gotoCase = 155; continue; };
            } else {
                if (yych <= 'E') { gotoCase = 236; continue; };
                if (yych != 'e') { gotoCase = 155; continue; };
            }
case 236:
            yych = this._charAt(++cursor);
            if (yych <= ',') {
                if (yych != '+') { gotoCase = 165; continue; };
            } else {
                if (yych <= '-') { gotoCase = 237; continue; };
                if (yych <= '/') { gotoCase = 165; continue; };
                if (yych <= '9') { gotoCase = 238; continue; };
                { gotoCase = 165; continue; };
            }
case 237:
            yych = this._charAt(++cursor);
            if (yych <= '/') { gotoCase = 165; continue; };
            if (yych >= ':') { gotoCase = 165; continue; };
case 238:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '/') { gotoCase = 155; continue; };
            if (yych <= '9') { gotoCase = 238; continue; };
            { gotoCase = 155; continue; };
case 240:
            ++cursor;
            yych = this._charAt(cursor);
case 241:
            if (yych <= '\r') {
                if (yych == '\n') { gotoCase = 165; continue; };
                if (yych <= '\f') { gotoCase = 240; continue; };
                { gotoCase = 165; continue; };
            } else {
                if (yych <= '\'') {
                    if (yych <= '&') { gotoCase = 240; continue; };
                    { gotoCase = 243; continue; };
                } else {
                    if (yych != '\\') { gotoCase = 240; continue; };
                }
            }
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= 'a') {
                if (yych <= '!') {
                    if (yych <= '\n') {
                        if (yych <= '\t') { gotoCase = 165; continue; };
                        { gotoCase = 246; continue; };
                    } else {
                        if (yych == '\r') { gotoCase = 246; continue; };
                        { gotoCase = 165; continue; };
                    }
                } else {
                    if (yych <= '\'') {
                        if (yych <= '"') { gotoCase = 240; continue; };
                        if (yych <= '&') { gotoCase = 165; continue; };
                        { gotoCase = 240; continue; };
                    } else {
                        if (yych == '\\') { gotoCase = 240; continue; };
                        { gotoCase = 165; continue; };
                    }
                }
            } else {
                if (yych <= 'q') {
                    if (yych <= 'f') {
                        if (yych <= 'b') { gotoCase = 240; continue; };
                        if (yych <= 'e') { gotoCase = 165; continue; };
                        { gotoCase = 240; continue; };
                    } else {
                        if (yych == 'n') { gotoCase = 240; continue; };
                        { gotoCase = 165; continue; };
                    }
                } else {
                    if (yych <= 't') {
                        if (yych == 's') { gotoCase = 165; continue; };
                        { gotoCase = 240; continue; };
                    } else {
                        if (yych <= 'u') { gotoCase = 245; continue; };
                        if (yych <= 'v') { gotoCase = 240; continue; };
                        { gotoCase = 165; continue; };
                    }
                }
            }
case 243:
            ++cursor;
            { this.tokenType = "javascript-string"; return cursor; }
case 245:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 165; continue; };
                if (yych <= '9') { gotoCase = 248; continue; };
                { gotoCase = 165; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 248; continue; };
                if (yych <= '`') { gotoCase = 165; continue; };
                if (yych <= 'f') { gotoCase = 248; continue; };
                { gotoCase = 165; continue; };
            }
case 246:
            ++cursor;
            this.setLexCondition(this._lexConditions.SSTRING);
            { this.tokenType = "javascript-string"; return cursor; }
case 248:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 165; continue; };
                if (yych >= ':') { gotoCase = 165; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 249; continue; };
                if (yych <= '`') { gotoCase = 165; continue; };
                if (yych >= 'g') { gotoCase = 165; continue; };
            }
case 249:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 165; continue; };
                if (yych >= ':') { gotoCase = 165; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 250; continue; };
                if (yych <= '`') { gotoCase = 165; continue; };
                if (yych >= 'g') { gotoCase = 165; continue; };
            }
case 250:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 165; continue; };
                if (yych <= '9') { gotoCase = 240; continue; };
                { gotoCase = 165; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 240; continue; };
                if (yych <= '`') { gotoCase = 165; continue; };
                if (yych <= 'f') { gotoCase = 240; continue; };
                { gotoCase = 165; continue; };
            }
case 251:
            ++cursor;
            yych = this._charAt(cursor);
case 252:
            if (yych <= '\r') {
                if (yych == '\n') { gotoCase = 165; continue; };
                if (yych <= '\f') { gotoCase = 251; continue; };
                { gotoCase = 165; continue; };
            } else {
                if (yych <= '"') {
                    if (yych <= '!') { gotoCase = 251; continue; };
                    { gotoCase = 243; continue; };
                } else {
                    if (yych != '\\') { gotoCase = 251; continue; };
                }
            }
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= 'a') {
                if (yych <= '!') {
                    if (yych <= '\n') {
                        if (yych <= '\t') { gotoCase = 165; continue; };
                        { gotoCase = 255; continue; };
                    } else {
                        if (yych == '\r') { gotoCase = 255; continue; };
                        { gotoCase = 165; continue; };
                    }
                } else {
                    if (yych <= '\'') {
                        if (yych <= '"') { gotoCase = 251; continue; };
                        if (yych <= '&') { gotoCase = 165; continue; };
                        { gotoCase = 251; continue; };
                    } else {
                        if (yych == '\\') { gotoCase = 251; continue; };
                        { gotoCase = 165; continue; };
                    }
                }
            } else {
                if (yych <= 'q') {
                    if (yych <= 'f') {
                        if (yych <= 'b') { gotoCase = 251; continue; };
                        if (yych <= 'e') { gotoCase = 165; continue; };
                        { gotoCase = 251; continue; };
                    } else {
                        if (yych == 'n') { gotoCase = 251; continue; };
                        { gotoCase = 165; continue; };
                    }
                } else {
                    if (yych <= 't') {
                        if (yych == 's') { gotoCase = 165; continue; };
                        { gotoCase = 251; continue; };
                    } else {
                        if (yych <= 'u') { gotoCase = 254; continue; };
                        if (yych <= 'v') { gotoCase = 251; continue; };
                        { gotoCase = 165; continue; };
                    }
                }
            }
case 254:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 165; continue; };
                if (yych <= '9') { gotoCase = 257; continue; };
                { gotoCase = 165; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 257; continue; };
                if (yych <= '`') { gotoCase = 165; continue; };
                if (yych <= 'f') { gotoCase = 257; continue; };
                { gotoCase = 165; continue; };
            }
case 255:
            ++cursor;
            this.setLexCondition(this._lexConditions.DSTRING);
            { this.tokenType = "javascript-string"; return cursor; }
case 257:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 165; continue; };
                if (yych >= ':') { gotoCase = 165; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 258; continue; };
                if (yych <= '`') { gotoCase = 165; continue; };
                if (yych >= 'g') { gotoCase = 165; continue; };
            }
case 258:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 165; continue; };
                if (yych >= ':') { gotoCase = 165; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 259; continue; };
                if (yych <= '`') { gotoCase = 165; continue; };
                if (yych >= 'g') { gotoCase = 165; continue; };
            }
case 259:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 165; continue; };
                if (yych <= '9') { gotoCase = 251; continue; };
                { gotoCase = 165; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 251; continue; };
                if (yych <= '`') { gotoCase = 165; continue; };
                if (yych <= 'f') { gotoCase = 251; continue; };
                { gotoCase = 165; continue; };
            }
case 260:
            ++cursor;
            if ((yych = this._charAt(cursor)) == '=') { gotoCase = 163; continue; };
            { gotoCase = 139; continue; };
/* *********************************** */
case this.case_REGEX:
            yych = this._charAt(cursor);
            if (yych <= '.') {
                if (yych <= '\n') {
                    if (yych <= '\t') { gotoCase = 264; continue; };
                    { gotoCase = 265; continue; };
                } else {
                    if (yych == '\r') { gotoCase = 265; continue; };
                    { gotoCase = 264; continue; };
                }
            } else {
                if (yych <= '[') {
                    if (yych <= '/') { gotoCase = 267; continue; };
                    if (yych <= 'Z') { gotoCase = 264; continue; };
                    { gotoCase = 269; continue; };
                } else {
                    if (yych <= '\\') { gotoCase = 270; continue; };
                    if (yych <= ']') { gotoCase = 265; continue; };
                    { gotoCase = 264; continue; };
                }
            }
case 263:
            { this.tokenType = "javascript-regexp"; return cursor; }
case 264:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            { gotoCase = 272; continue; };
case 265:
            ++cursor;
case 266:
            { this.tokenType = null; return cursor; }
case 267:
            ++cursor;
            yych = this._charAt(cursor);
            { gotoCase = 278; continue; };
case 268:
            this.setLexCondition(this._lexConditions.NODIV);
            { this.tokenType = "javascript-regexp"; return cursor; }
case 269:
            yyaccept = 1;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych <= '\r') {
                if (yych == '\n') { gotoCase = 266; continue; };
                if (yych <= '\f') { gotoCase = 276; continue; };
                { gotoCase = 266; continue; };
            } else {
                if (yych <= '*') {
                    if (yych <= ')') { gotoCase = 276; continue; };
                    { gotoCase = 266; continue; };
                } else {
                    if (yych == '/') { gotoCase = 266; continue; };
                    { gotoCase = 276; continue; };
                }
            }
case 270:
            yych = this._charAt(++cursor);
            if (yych == '\n') { gotoCase = 266; continue; };
            if (yych == '\r') { gotoCase = 266; continue; };
case 271:
            yyaccept = 0;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
case 272:
            if (yych <= '.') {
                if (yych <= '\n') {
                    if (yych <= '\t') { gotoCase = 271; continue; };
                    { gotoCase = 263; continue; };
                } else {
                    if (yych == '\r') { gotoCase = 263; continue; };
                    { gotoCase = 271; continue; };
                }
            } else {
                if (yych <= '[') {
                    if (yych <= '/') { gotoCase = 277; continue; };
                    if (yych <= 'Z') { gotoCase = 271; continue; };
                    { gotoCase = 275; continue; };
                } else {
                    if (yych <= '\\') { gotoCase = 273; continue; };
                    if (yych <= ']') { gotoCase = 263; continue; };
                    { gotoCase = 271; continue; };
                }
            }
case 273:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych == '\n') { gotoCase = 274; continue; };
            if (yych != '\r') { gotoCase = 271; continue; };
case 274:
            cursor = YYMARKER;
            if (yyaccept <= 0) {
                { gotoCase = 263; continue; };
            } else {
                { gotoCase = 266; continue; };
            }
case 275:
            ++cursor;
            yych = this._charAt(cursor);
case 276:
            if (yych <= '*') {
                if (yych <= '\f') {
                    if (yych == '\n') { gotoCase = 274; continue; };
                    { gotoCase = 275; continue; };
                } else {
                    if (yych <= '\r') { gotoCase = 274; continue; };
                    if (yych <= ')') { gotoCase = 275; continue; };
                    { gotoCase = 274; continue; };
                }
            } else {
                if (yych <= '[') {
                    if (yych == '/') { gotoCase = 274; continue; };
                    { gotoCase = 275; continue; };
                } else {
                    if (yych <= '\\') { gotoCase = 281; continue; };
                    if (yych <= ']') { gotoCase = 279; continue; };
                    { gotoCase = 275; continue; };
                }
            }
case 277:
            ++cursor;
            yych = this._charAt(cursor);
case 278:
            if (yych <= 'h') {
                if (yych == 'g') { gotoCase = 277; continue; };
                { gotoCase = 268; continue; };
            } else {
                if (yych <= 'i') { gotoCase = 277; continue; };
                if (yych == 'm') { gotoCase = 277; continue; };
                { gotoCase = 268; continue; };
            }
case 279:
            yyaccept = 0;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '*') {
                if (yych <= '\f') {
                    if (yych == '\n') { gotoCase = 263; continue; };
                    { gotoCase = 279; continue; };
                } else {
                    if (yych <= '\r') { gotoCase = 263; continue; };
                    if (yych <= ')') { gotoCase = 279; continue; };
                    { gotoCase = 271; continue; };
                }
            } else {
                if (yych <= 'Z') {
                    if (yych == '/') { gotoCase = 277; continue; };
                    { gotoCase = 279; continue; };
                } else {
                    if (yych <= '[') { gotoCase = 275; continue; };
                    if (yych <= '\\') { gotoCase = 282; continue; };
                    { gotoCase = 279; continue; };
                }
            }
case 281:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych == '\n') { gotoCase = 274; continue; };
            if (yych == '\r') { gotoCase = 274; continue; };
            { gotoCase = 275; continue; };
case 282:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych == '\n') { gotoCase = 274; continue; };
            if (yych == '\r') { gotoCase = 274; continue; };
            { gotoCase = 279; continue; };
/* *********************************** */
case this.case_SSTRING:
            yych = this._charAt(cursor);
            if (yych <= '\r') {
                if (yych == '\n') { gotoCase = 287; continue; };
                if (yych <= '\f') { gotoCase = 286; continue; };
                { gotoCase = 287; continue; };
            } else {
                if (yych <= '\'') {
                    if (yych <= '&') { gotoCase = 286; continue; };
                    { gotoCase = 289; continue; };
                } else {
                    if (yych == '\\') { gotoCase = 291; continue; };
                    { gotoCase = 286; continue; };
                }
            }
case 285:
            { this.tokenType = "javascript-string"; return cursor; }
case 286:
            yyaccept = 0;
            yych = this._charAt(YYMARKER = ++cursor);
            { gotoCase = 293; continue; };
case 287:
            ++cursor;
case 288:
            { this.tokenType = null; return cursor; }
case 289:
            ++cursor;
case 290:
            this.setLexCondition(this._lexConditions.NODIV);
            { this.tokenType = "javascript-string"; return cursor; }
case 291:
            yyaccept = 1;
            yych = this._charAt(YYMARKER = ++cursor);
            if (yych <= 'e') {
                if (yych <= '\'') {
                    if (yych == '"') { gotoCase = 292; continue; };
                    if (yych <= '&') { gotoCase = 288; continue; };
                } else {
                    if (yych <= '\\') {
                        if (yych <= '[') { gotoCase = 288; continue; };
                    } else {
                        if (yych != 'b') { gotoCase = 288; continue; };
                    }
                }
            } else {
                if (yych <= 'r') {
                    if (yych <= 'm') {
                        if (yych >= 'g') { gotoCase = 288; continue; };
                    } else {
                        if (yych <= 'n') { gotoCase = 292; continue; };
                        if (yych <= 'q') { gotoCase = 288; continue; };
                    }
                } else {
                    if (yych <= 't') {
                        if (yych <= 's') { gotoCase = 288; continue; };
                    } else {
                        if (yych <= 'u') { gotoCase = 294; continue; };
                        if (yych >= 'w') { gotoCase = 288; continue; };
                    }
                }
            }
case 292:
            yyaccept = 0;
            YYMARKER = ++cursor;
            yych = this._charAt(cursor);
case 293:
            if (yych <= '\r') {
                if (yych == '\n') { gotoCase = 285; continue; };
                if (yych <= '\f') { gotoCase = 292; continue; };
                { gotoCase = 285; continue; };
            } else {
                if (yych <= '\'') {
                    if (yych <= '&') { gotoCase = 292; continue; };
                    { gotoCase = 300; continue; };
                } else {
                    if (yych == '\\') { gotoCase = 299; continue; };
                    { gotoCase = 292; continue; };
                }
            }
case 294:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 295; continue; };
                if (yych <= '9') { gotoCase = 296; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 296; continue; };
                if (yych <= '`') { gotoCase = 295; continue; };
                if (yych <= 'f') { gotoCase = 296; continue; };
            }
case 295:
            cursor = YYMARKER;
            if (yyaccept <= 0) {
                { gotoCase = 285; continue; };
            } else {
                { gotoCase = 288; continue; };
            }
case 296:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 295; continue; };
                if (yych >= ':') { gotoCase = 295; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 297; continue; };
                if (yych <= '`') { gotoCase = 295; continue; };
                if (yych >= 'g') { gotoCase = 295; continue; };
            }
case 297:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 295; continue; };
                if (yych >= ':') { gotoCase = 295; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 298; continue; };
                if (yych <= '`') { gotoCase = 295; continue; };
                if (yych >= 'g') { gotoCase = 295; continue; };
            }
case 298:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= '@') {
                if (yych <= '/') { gotoCase = 295; continue; };
                if (yych <= '9') { gotoCase = 292; continue; };
                { gotoCase = 295; continue; };
            } else {
                if (yych <= 'F') { gotoCase = 292; continue; };
                if (yych <= '`') { gotoCase = 295; continue; };
                if (yych <= 'f') { gotoCase = 292; continue; };
                { gotoCase = 295; continue; };
            }
case 299:
            ++cursor;
            yych = this._charAt(cursor);
            if (yych <= 'e') {
                if (yych <= '\'') {
                    if (yych == '"') { gotoCase = 292; continue; };
                    if (yych <= '&') { gotoCase = 295; continue; };
                    { gotoCase = 292; continue; };
                } else {
                    if (yych <= '\\') {
                        if (yych <= '[') { gotoCase = 295; continue; };
                        { gotoCase = 292; continue; };
                    } else {
                        if (yych == 'b') { gotoCase = 292; continue; };
                        { gotoCase = 295; continue; };
                    }
                }
            } else {
                if (yych <= 'r') {
                    if (yych <= 'm') {
                        if (yych <= 'f') { gotoCase = 292; continue; };
                        { gotoCase = 295; continue; };
                    } else {
                        if (yych <= 'n') { gotoCase = 292; continue; };
                        if (yych <= 'q') { gotoCase = 295; continue; };
                        { gotoCase = 292; continue; };
                    }
                } else {
                    if (yych <= 't') {
                        if (yych <= 's') { gotoCase = 295; continue; };
                        { gotoCase = 292; continue; };
                    } else {
                        if (yych <= 'u') { gotoCase = 294; continue; };
                        if (yych <= 'v') { gotoCase = 292; continue; };
                        { gotoCase = 295; continue; };
                    }
                }
            }
case 300:
            ++cursor;
            yych = this._charAt(cursor);
            { gotoCase = 290; continue; };
        }

        }
    }
}

WebInspector.SourceJavaScriptTokenizer.prototype.__proto__ = WebInspector.SourceTokenizer.prototype;
/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
 * Copyright (C) 2009 Apple Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 */
WebInspector.TextEditorHighlighter = function(textModel, damageCallback)
{
    this._textModel = textModel;
    this._tokenizer = WebInspector.SourceTokenizer.Registry.getInstance().getTokenizer("text/html");
    this._damageCallback = damageCallback;
    this._highlightChunkLimit = 1000;
}

WebInspector.TextEditorHighlighter.prototype = {
    set mimeType(mimeType)
    {
        var tokenizer = WebInspector.SourceTokenizer.Registry.getInstance().getTokenizer(mimeType);
        if (tokenizer)
            this._tokenizer = tokenizer;
    },

    set highlightChunkLimit(highlightChunkLimit)
    {
        this._highlightChunkLimit = highlightChunkLimit;
    },

    /**
     * @param {boolean=} forceRun
     */
    highlight: function(endLine, forceRun)
    {
        // First check if we have work to do.
        var state = this._textModel.getAttribute(endLine - 1, "highlight");
        if (state && state.postConditionStringified) {
            // Last line is highlighted, just exit.
            return;
        }

        this._requestedEndLine = endLine;

        if (this._highlightTimer && !forceRun) {
            // There is a timer scheduled, it will catch the new job based on the new endLine set.
            return;
        }

        // We will be highlighting. First rewind to the last highlighted line to gain proper highlighter context.
        var startLine = endLine;
        while (startLine > 0) {
            state = this._textModel.getAttribute(startLine - 1, "highlight");
            if (state && state.postConditionStringified)
                break;
            startLine--;
        }

        // Do small highlight synchronously. This will provide instant highlight on PageUp / PageDown, gentle scrolling.
        this._highlightInChunks(startLine, endLine);
    },

    updateHighlight: function(startLine, endLine)
    {
        // Start line was edited, we should highlight everything until endLine.
        this._clearHighlightState(startLine);

        if (startLine) {
            var state = this._textModel.getAttribute(startLine - 1, "highlight");
            if (!state || !state.postConditionStringified) {
                // Highlighter did not reach this point yet, nothing to update. It will reach it on subsequent timer tick and do the job.
                return false;
            }
        }

        var restored = this._highlightLines(startLine, endLine);
        if (!restored) {
            for (var i = this._lastHighlightedLine; i < this._textModel.linesCount; ++i) {
                var state = this._textModel.getAttribute(i, "highlight");
                if (!state && i > endLine)
                    break;
                this._textModel.setAttribute(i, "highlight-outdated", state);
                this._textModel.removeAttribute(i, "highlight");
            }

            if (this._highlightTimer) {
                clearTimeout(this._highlightTimer);
                this._requestedEndLine = endLine;
                this._highlightTimer = setTimeout(this._highlightInChunks.bind(this, this._lastHighlightedLine, this._requestedEndLine), 10);
            }
        }
        return restored;
    },

    _highlightInChunks: function(startLine, endLine)
    {
        delete this._highlightTimer;

        // First we always check if we have work to do. Could be that user scrolled back and we can quit.
        var state = this._textModel.getAttribute(this._requestedEndLine - 1, "highlight");
        if (state && state.postConditionStringified)
            return;

        if (this._requestedEndLine !== endLine) {
            // User keeps updating the job in between of our timer ticks. Just reschedule self, don't eat CPU (they must be scrolling).
            this._highlightTimer = setTimeout(this._highlightInChunks.bind(this, startLine, this._requestedEndLine), 100);
            return;
        }

        // The textModel may have been already updated.
        if (this._requestedEndLine > this._textModel.linesCount)
            this._requestedEndLine = this._textModel.linesCount;

        this._highlightLines(startLine, this._requestedEndLine);

        // Schedule tail highlight if necessary.
        if (this._lastHighlightedLine < this._requestedEndLine)
            this._highlightTimer = setTimeout(this._highlightInChunks.bind(this, this._lastHighlightedLine, this._requestedEndLine), 10);
    },

    _highlightLines: function(startLine, endLine)
    {
        // Restore highlighter context taken from previous line.
        var state = this._textModel.getAttribute(startLine - 1, "highlight");
        var postConditionStringified = state ? state.postConditionStringified : JSON.stringify(this._tokenizer.createInitialCondition());

        var tokensCount = 0;
        for (var lineNumber = startLine; lineNumber < endLine; ++lineNumber) {
            state = this._selectHighlightState(lineNumber, postConditionStringified);
            if (state.postConditionStringified) {
                // This line is already highlighted.
                postConditionStringified = state.postConditionStringified;
            } else {
                var lastHighlightedColumn = 0;
                if (state.midConditionStringified) {
                    lastHighlightedColumn = state.lastHighlightedColumn;
                    postConditionStringified = state.midConditionStringified;
                }

                var line = this._textModel.line(lineNumber);
                this._tokenizer.line = line;
                this._tokenizer.condition = JSON.parse(postConditionStringified);

                // Highlight line.
                do {
                    var newColumn = this._tokenizer.nextToken(lastHighlightedColumn);
                    var tokenType = this._tokenizer.tokenType;
                    if (tokenType)
                        state[lastHighlightedColumn] = { length: newColumn - lastHighlightedColumn, tokenType: tokenType };
                    lastHighlightedColumn = newColumn;
                    if (++tokensCount > this._highlightChunkLimit)
                        break;
                } while (lastHighlightedColumn < line.length);

                postConditionStringified = JSON.stringify(this._tokenizer.condition);

                if (lastHighlightedColumn < line.length) {
                    // Too much work for single chunk - exit.
                    state.lastHighlightedColumn = lastHighlightedColumn;
                    state.midConditionStringified = postConditionStringified;
                    break;
                } else {
                    delete state.lastHighlightedColumn;
                    delete state.midConditionStringified;
                    state.postConditionStringified = postConditionStringified;
                }
            }

            var nextLineState = this._textModel.getAttribute(lineNumber + 1, "highlight");
            if (nextLineState && nextLineState.preConditionStringified === state.postConditionStringified) {
                // Following lines are up to date, no need re-highlight.
                ++lineNumber;
                this._damageCallback(startLine, lineNumber);

                // Advance the "pointer" to the last highlighted line within the given chunk.
                for (; lineNumber < endLine; ++lineNumber) {
                    state = this._textModel.getAttribute(lineNumber, "highlight");
                    if (!state || !state.postConditionStringified)
                        break;
                }
                this._lastHighlightedLine = lineNumber;
                return true;
            }
        }

        this._damageCallback(startLine, lineNumber);
        this._lastHighlightedLine = lineNumber;
        return false;
    },

    _selectHighlightState: function(lineNumber, preConditionStringified)
    {
        var state = this._textModel.getAttribute(lineNumber, "highlight");
        if (state && state.preConditionStringified === preConditionStringified)
            return state;

        var outdatedState = this._textModel.getAttribute(lineNumber, "highlight-outdated");
        if (outdatedState && outdatedState.preConditionStringified === preConditionStringified) {
            // Swap states.
            this._textModel.setAttribute(lineNumber, "highlight", outdatedState);
            this._textModel.setAttribute(lineNumber, "highlight-outdated", state);
            return outdatedState;
        }

        if (state)
            this._textModel.setAttribute(lineNumber, "highlight-outdated", state);

        state = {};
        state.preConditionStringified = preConditionStringified;
        this._textModel.setAttribute(lineNumber, "highlight", state);
        return state;
    },

    _clearHighlightState: function(lineNumber)
    {
        this._textModel.removeAttribute(lineNumber, "highlight");
        this._textModel.removeAttribute(lineNumber, "highlight-outdated");
    }
}
/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 */
WebInspector.TextRange = function(startLine, startColumn, endLine, endColumn)
{
    this.startLine = startLine;
    this.startColumn = startColumn;
    this.endLine = endLine;
    this.endColumn = endColumn;
}

WebInspector.TextRange.prototype = {
    isEmpty: function()
    {
        return this.startLine === this.endLine && this.startColumn === this.endColumn;
    },

    get linesCount()
    {
        return this.endLine - this.startLine;
    },

    clone: function()
    {
        return new WebInspector.TextRange(this.startLine, this.startColumn, this.endLine, this.endColumn);
    }
}

/**
 * @constructor
 */
WebInspector.TextEditorModel = function()
{
    this._lines = [""];
    this._attributes = [];
    this._undoStack = [];
    this._noPunctuationRegex = /[^ !%&()*+,-.:;<=>?\[\]\^{|}~]+/;
    this._lineBreak = "\n";
}

WebInspector.TextEditorModel.prototype = {
    set changeListener(changeListener)
    {
        this._changeListener = changeListener;
    },

    get linesCount()
    {
        return this._lines.length;
    },

    get text()
    {
        return this._lines.join(this._lineBreak);
    },

    line: function(lineNumber)
    {
        if (lineNumber >= this._lines.length)
            throw "Out of bounds:" + lineNumber;
        return this._lines[lineNumber];
    },

    lineLength: function(lineNumber)
    {
        return this._lines[lineNumber].length;
    },

    setText: function(range, text)
    {
        text = text || "";
        if (!range) {
            range = new WebInspector.TextRange(0, 0, this._lines.length - 1, this._lines[this._lines.length - 1].length);
            this._lineBreak = /\r\n/.test(text) ? "\r\n" : "\n";
        }
        var command = this._pushUndoableCommand(range);
        var newRange = this._innerSetText(range, text);
        command.range = newRange.clone();

        if (this._changeListener)
            this._changeListener(range, newRange, command.text, text);
        return newRange;
    },
    appendText: function(text)
    {
        text = text || "";
        text = "\n"+text;

           var range = new WebInspector.TextRange(this._lines.length - 1, this._lines[this._lines.length - 1].length,this._lines.length - 1, this._lines[this._lines.length - 1].length);


        var command = this._pushUndoableCommand(range);
        var newRange = this._innerSetText(range, text);
        command.range = newRange.clone();

        if (this._changeListener)
            this._changeListener(range, newRange, command.text, text);
        return newRange;
    },

    _innerSetText: function(range, text)
    {
        this._eraseRange(range);
        if (text === "")
            return new WebInspector.TextRange(range.startLine, range.startColumn, range.startLine, range.startColumn);

        var newLines = text.split(/\r?\n/);

        var prefix = this._lines[range.startLine].substring(0, range.startColumn);
        var suffix = this._lines[range.startLine].substring(range.startColumn);

        var postCaret = prefix.length;
        // Insert text.
        if (newLines.length === 1) {
            this._setLine(range.startLine, prefix + newLines[0] + suffix);
            postCaret += newLines[0].length;
        } else {
            this._setLine(range.startLine, prefix + newLines[0]);
            for (var i = 1; i < newLines.length; ++i)
                this._insertLine(range.startLine + i, newLines[i]);
            this._setLine(range.startLine + newLines.length - 1, newLines[newLines.length - 1] + suffix);
            postCaret = newLines[newLines.length - 1].length;
        }
        return new WebInspector.TextRange(range.startLine, range.startColumn,
                                          range.startLine + newLines.length - 1, postCaret);
    },

    _eraseRange: function(range)
    {
        if (range.isEmpty())
            return;

        var prefix = this._lines[range.startLine].substring(0, range.startColumn);
        var suffix = this._lines[range.endLine].substring(range.endColumn);

        if (range.endLine > range.startLine)
            this._removeLines(range.startLine + 1, range.endLine - range.startLine);
        this._setLine(range.startLine, prefix + suffix);
    },

    _setLine: function(lineNumber, text)
    {
        this._lines[lineNumber] = text;
    },

    _removeLines: function(fromLine, count)
    {
        this._lines.splice(fromLine, count);
        this._attributes.splice(fromLine, count);
    },

    _insertLine: function(lineNumber, text)
    {
        this._lines.splice(lineNumber, 0, text);
        this._attributes.splice(lineNumber, 0, {});
    },

    wordRange: function(lineNumber, column)
    {
        return new WebInspector.TextRange(lineNumber, this.wordStart(lineNumber, column, true), lineNumber, this.wordEnd(lineNumber, column, true));
    },

    wordStart: function(lineNumber, column, gapless)
    {
        var line = this._lines[lineNumber];
        var prefix = line.substring(0, column).split("").reverse().join("");
        var prefixMatch = this._noPunctuationRegex.exec(prefix);
        return prefixMatch && (!gapless || prefixMatch.index === 0) ? column - prefixMatch.index - prefixMatch[0].length : column;
    },

    wordEnd: function(lineNumber, column, gapless)
    {
        var line = this._lines[lineNumber];
        var suffix = line.substring(column);
        var suffixMatch = this._noPunctuationRegex.exec(suffix);
        return suffixMatch && (!gapless || suffixMatch.index === 0) ? column + suffixMatch.index + suffixMatch[0].length : column;
    },

    copyRange: function(range)
    {
        if (!range)
            range = new WebInspector.TextRange(0, 0, this._lines.length - 1, this._lines[this._lines.length - 1].length);

        var clip = [];
        if (range.startLine === range.endLine) {
            clip.push(this._lines[range.startLine].substring(range.startColumn, range.endColumn));
            return clip.join(this._lineBreak);
        }
        clip.push(this._lines[range.startLine].substring(range.startColumn));
        for (var i = range.startLine + 1; i < range.endLine; ++i)
            clip.push(this._lines[i]);
        clip.push(this._lines[range.endLine].substring(0, range.endColumn));
        return clip.join(this._lineBreak);
    },

    setAttribute: function(line, name, value)
    {
        var attrs = this._attributes[line];
        if (!attrs) {
            attrs = {};
            this._attributes[line] = attrs;
        }
        attrs[name] = value;
    },

    getAttribute: function(line, name)
    {
        var attrs = this._attributes[line];
        return attrs ? attrs[name] : null;
    },

    removeAttribute: function(line, name)
    {
        var attrs = this._attributes[line];
        if (attrs)
            delete attrs[name];
    },

    _pushUndoableCommand: function(range)
    {
        var command = {
            text: this.copyRange(range),
            startLine: range.startLine,
            startColumn: range.startColumn,
            endLine: range.startLine,
            endColumn: range.startColumn
        };
        if (this._inUndo)
            this._redoStack.push(command);
        else {
            if (!this._inRedo)
                this._redoStack = [];
            this._undoStack.push(command);
        }
        return command;
    },

    undo: function(callback)
    {
        this._markRedoableState();

        this._inUndo = true;
        var range = this._doUndo(this._undoStack, callback);
        delete this._inUndo;

        return range;
    },

    redo: function(callback)
    {
        this.markUndoableState();

        this._inRedo = true;
        var range = this._doUndo(this._redoStack, callback);
        delete this._inRedo;

        return range;
    },

    _doUndo: function(stack, callback)
    {
        var range = null;
        for (var i = stack.length - 1; i >= 0; --i) {
            var command = stack[i];
            stack.length = i;

            range = this.setText(command.range, command.text);
            if (callback)
                callback(command.range, range);
            if (i > 0 && stack[i - 1].explicit)
                return range;
        }
        return range;
    },

    markUndoableState: function()
    {
        if (this._undoStack.length)
            this._undoStack[this._undoStack.length - 1].explicit = true;
    },

    _markRedoableState: function()
    {
        if (this._redoStack.length)
            this._redoStack[this._redoStack.length - 1].explicit = true;
    },

    resetUndoStack: function()
    {
        this._undoStack = [];
    }
}

WebInspector.View = function()
{
    this.element = document.createElement("div");
   
    this.element.__view = this;
    this._visible = false;
    this._children = [];
    this._inDetach = false;
}

WebInspector.View.prototype = {
    get visible()
    {
        return this._visible;
    },

    set visible(x)
    {
        if (this._visible === x)
            return;

        if (x)
            this.show(this.element.parentElement);
        else
            this.hide();
    },

    wasShown: function()
    {
        this.restoreScrollPositions();
        this.onResize();
    },

    willHide: function()
    {
        this.storeScrollPositions();
    },

    willDetach: function()
    {
    },

    /**
     * @param {Element} parentElement
     */
    show: function(parentElement)
    {
        this._visible = true;
        this.element.addStyleClass("visible");
        if (parentElement && this.element.parentElement != parentElement)
            this.attach(parentElement);
        this.dispatchToSelfAndChildren("wasShown", true);
    },

    hide: function()
    {
        this.dispatchToSelfAndChildren("willHide", true);
        if (!this._inDetach)
            this.element.removeStyleClass("visible");
        this._visible = false;
    },

    /**
     * @param {Element} parentElement
     */
    attach: function(parentElement)
    {
        parentElement.appendChild(this.element);
    },

    detach: function()
    {
        if (this._visible) {
            this._inDetach = true;
            this.hide();
            this._inDetach = false;
        }

        this.dispatchToSelfAndChildren("willDetach", false);

        if (this.element.parentElement)
            this.element.parentElement.removeChild(this.element);
    },

    elementsToRestoreScrollPositionsFor: function()
    {
        return [this.element];
    },

    storeScrollPositions: function()
    {
        var elements = this.elementsToRestoreScrollPositionsFor();
        for (var i = 0; i < elements.length; ++i) {
            var container = elements[i];
            container._scrollTop = container.scrollTop;
            container._scrollLeft = container.scrollLeft;
        }
    },

    restoreScrollPositions: function()
    {
        var elements = this.elementsToRestoreScrollPositionsFor();
        for (var i = 0; i < elements.length; ++i) {
            var container = elements[i];
            if (container._scrollTop)
                container.scrollTop = container._scrollTop;
            if (container._scrollLeft)
                container.scrollLeft = container._scrollLeft;
        }
    },

    _addChildView: function(view)
    {
        this._children.push(view);
        view._parentView = this;
    },

    _removeChildView: function(view)
    {
        var childIndex = this._children.indexOf(view);
        if (childIndex < 0) {
            console.error("Attempt to remove non-child view");
            return;
        }

        this._children.splice(childIndex, 1);
        view._parentView = null;
    },

    onResize: function()
    {
    },

    canHighlightLine: function()
    {
        return false;
    },

    highlightLine: function(line)
    {
    },

    doResize: function()
    {
        this.dispatchToSelfAndChildren("onResize", true);
    },

    dispatchToSelfAndChildren: function(methodName, visibleOnly)
    {
        if (visibleOnly && !this.visible)
            return;
        if (typeof this[methodName] === "function")
            this[methodName].call(this);
        this.dispatchToChildren(methodName, visibleOnly);
    },

    dispatchToChildren: function(methodName, visibleOnly)
    {
        if (visibleOnly && !this.visible)
            return;
        for (var i = 0; i < this._children.length; ++i)
            this._children[i].dispatchToSelfAndChildren(methodName, visibleOnly);
    },

    _handleInsertedIntoDocument: function(event)
    {
        var parentElement = this.element.parentElement;
        while (parentElement && !parentElement.__view)
            parentElement = parentElement.parentElement;

        var parentView = parentElement ? parentElement.__view : WebInspector._rootView;
        parentView._addChildView(this);
        this.onInsertedIntoDocument();
    },

    onInsertedIntoDocument: function()
    {
    },

    _handleRemovedFromDocument: function(event)
    {
        if (this._parentView)
            this._parentView._removeChildView(this);
    },

    printViewHierarchy: function()
    {
        var lines = [];
        this._collectViewHierarchy("", lines);
        console.log(lines.join("\n"));
    },

    _collectViewHierarchy: function(prefix, lines)
    {
        lines.push(prefix + "[" + this.element.className + "]" + (this._children.length ? " {" : ""));

        for (var i = 0; i < this._children.length; ++i)
            this._children[i]._collectViewHierarchy(prefix + "    ", lines);

        if (this._children.length)
            lines.push(prefix + "}");
    }
}

WebInspector.View.prototype.__proto__ = Object.prototype;





WebInspector.TextViewer = function(textModel, delegate)
{
    WebInspector.View.call(this);
    var url ="";

    this._textModel = textModel;
    this._textModel.changeListener = this._textChanged.bind(this);
    this._textModel.resetUndoStack();
    this._delegate = delegate||new WebInspector.TextViewerDelegate();

    this.element.className = "text-editor monospace";
   

    var enterTextChangeMode = this._enterInternalTextChangeMode.bind(this);
    var exitTextChangeMode = this._exitInternalTextChangeMode.bind(this);
    var syncScrollListener = this._syncScroll.bind(this);
    var syncDecorationsForLineListener = this._syncDecorationsForLine.bind(this);
    var syncLineHeightListener = this._syncLineHeight.bind(this);
    this._mainPanel = new WebInspector.TextEditorMainPanel(this._textModel, url, syncScrollListener, syncDecorationsForLineListener, enterTextChangeMode, exitTextChangeMode);
    this._gutterPanel = new WebInspector.TextEditorGutterPanel(this._textModel, syncDecorationsForLineListener, syncLineHeightListener);
    this.element.appendChild(this._mainPanel.element);
    this.element.appendChild(this._gutterPanel.element);
    

    // Forward mouse wheel events from the unscrollable gutter to the main panel.
    function forwardWheelEvent(event)
    {
        var clone = document.createEvent("WheelEvent");
        clone.initWebKitWheelEvent(event.wheelDeltaX, event.wheelDeltaY,
        event.view,
        event.screenX, event.screenY,
        event.clientX, event.clientY,
        event.ctrlKey, event.altKey, event.shiftKey, event.metaKey);
        this._mainPanel.element.dispatchEvent(clone);
    }
    this._gutterPanel.element.addEventListener("mousewheel", forwardWheelEvent.bind(this), false);
    

    this.element.addEventListener("dblclick", this._doubleClick.bind(this), true);
    this.element.addEventListener("keydown", this._handleKeyDown.bind(this), false);
    this.element.addEventListener("contextmenu", this._contextMenu.bind(this), true);
     
 
    this._registerShortcuts();
   
}

WebInspector.TextViewer.prototype = {
    set mimeType(mimeType)
    {
        this._mainPanel.mimeType = mimeType;
    },

    set readOnly(readOnly)
    {
        if (this._mainPanel.readOnly === readOnly)
            return;
        this._mainPanel.readOnly = readOnly;
    },

    get readOnly()
    {
        return this._mainPanel.readOnly;
    },

    get textModel()
    {
        return this._textModel;
    },

    revealLine: function(lineNumber)
    {
        this._mainPanel.revealLine(lineNumber);
    },

    addDecoration: function(lineNumber, decoration)
    {
        this._mainPanel.addDecoration(lineNumber, decoration);
        this._gutterPanel.addDecoration(lineNumber, decoration);
    },

    removeDecoration: function(lineNumber, decoration)
    {
        this._mainPanel.removeDecoration(lineNumber, decoration);
        this._gutterPanel.removeDecoration(lineNumber, decoration);
    },

    markAndRevealRange: function(range)
    {
        this._mainPanel.markAndRevealRange(range);
    },

    highlightLine: function(lineNumber)
    {
        if (typeof lineNumber !== "number" || lineNumber < 0)
            return;

        lineNumber = Math.min(lineNumber, this._textModel.linesCount - 1);
        this._mainPanel.highlightLine(lineNumber);
    },

    clearLineHighlight: function()
    {
        this._mainPanel.clearLineHighlight();
    },

    freeCachedElements: function()
    {
        this._mainPanel.freeCachedElements();
        this._gutterPanel.freeCachedElements();
    },

    elementsToRestoreScrollPositionsFor: function()
    {
        return [this._mainPanel.element];
    },

    inheritScrollPositions: function(textViewer)
    {
        this._mainPanel.element._scrollTop = textViewer._mainPanel.element.scrollTop;
        this._mainPanel.element._scrollLeft = textViewer._mainPanel.element.scrollLeft;
    },

    beginUpdates: function()
    {
        this._mainPanel.beginUpdates();
        this._gutterPanel.beginUpdates();
    },

    endUpdates: function()
    {
        this._mainPanel.endUpdates();
        this._gutterPanel.endUpdates();
        this._updatePanelOffsets();
    },

    onResize: function()
    {
        this._mainPanel.resize();
        this._gutterPanel.resize();
        this._updatePanelOffsets();
    },

    // WebInspector.TextModel listener
    _textChanged: function(oldRange, newRange, oldText, newText)
    {
        if (!this._internalTextChangeMode)
            this._textModel.resetUndoStack();
        this._mainPanel.textChanged(oldRange, newRange);
        this._gutterPanel.textChanged(oldRange, newRange);
        this._updatePanelOffsets();
    },

    _enterInternalTextChangeMode: function()
    {
        this._internalTextChangeMode = true;
        this._delegate.beforeTextChanged();
    },

    _exitInternalTextChangeMode: function(oldRange, newRange)
    {
        this._internalTextChangeMode = false;
        this._delegate.afterTextChanged(oldRange, newRange);
    },

    _updatePanelOffsets: function()
    {
        var lineNumbersWidth = this._gutterPanel.element.offsetWidth;
        if (lineNumbersWidth)
            this._mainPanel.element.style.setProperty("left", lineNumbersWidth + "px");
        else
            this._mainPanel.element.style.removeProperty("left"); // Use default value set in CSS.
    },

    _syncScroll: function()
    {
        var mainElement = this._mainPanel.element;
        var gutterElement = this._gutterPanel.element;
        // Handle horizontal scroll bar at the bottom of the main panel.
        this._gutterPanel.syncClientHeight(mainElement.clientHeight);
        gutterElement.scrollTop = mainElement.scrollTop;
    },

    _syncDecorationsForLine: function(lineNumber)
    {
        if (lineNumber >= this._textModel.linesCount)
            return;

        var mainChunk = this._mainPanel.chunkForLine(lineNumber);
        if (mainChunk.linesCount === 1 && mainChunk.decorated) {
            var gutterChunk = this._gutterPanel.makeLineAChunk(lineNumber);
            var height = mainChunk.height;
            if (height)
                gutterChunk.element.style.setProperty("height", height + "px");
            else
                gutterChunk.element.style.removeProperty("height");
        } else {
            var gutterChunk = this._gutterPanel.chunkForLine(lineNumber);
            if (gutterChunk.linesCount === 1)
                gutterChunk.element.style.removeProperty("height");
        }
    },

    _syncLineHeight: function(gutterRow) {
        if (this._lineHeightSynced)
            return;
        if (gutterRow && gutterRow.offsetHeight) {
            // Force equal line heights for the child panels.
            this.element.style.setProperty("line-height", gutterRow.offsetHeight + "px");
            this._lineHeightSynced = true;
        }
    },

    _doubleClick: function(event)
    {
        if (!this.readOnly)
            return;

        var lineRow = event.target.enclosingNodeOrSelfWithClass("webkit-line-content");
       
        if (!lineRow)
            return;  // Do not trigger editing from line numbers.

        this._delegate.doubleClick(lineRow.lineNumber);
        window.getSelection().collapseToStart();
    },

    _registerShortcuts: function()
    {
        var keys = WebInspector.KeyboardShortcut.Keys;
        var modifiers = WebInspector.KeyboardShortcut.Modifiers;

        this._shortcuts = {};
        var commitEditing = this._commitEditing.bind(this);
        var cancelEditing = this._cancelEditing.bind(this);
        this._shortcuts[WebInspector.KeyboardShortcut.makeKey("s", modifiers.CtrlOrMeta)] = commitEditing;
        this._shortcuts[WebInspector.KeyboardShortcut.makeKey(keys.Enter.code, modifiers.CtrlOrMeta)] = commitEditing;
        this._shortcuts[WebInspector.KeyboardShortcut.makeKey(keys.Esc.code)] = cancelEditing;

        var handleUndo = this._mainPanel.handleUndoRedo.bind(this._mainPanel, false);
        var handleRedo = this._mainPanel.handleUndoRedo.bind(this._mainPanel, true);
        this._shortcuts[WebInspector.KeyboardShortcut.makeKey("z", modifiers.CtrlOrMeta)] = handleUndo;
        this._shortcuts[WebInspector.KeyboardShortcut.makeKey("y", modifiers.CtrlOrMeta)] = handleRedo;

        var handleTabKey = this._mainPanel.handleTabKeyPress.bind(this._mainPanel, false);
        var handleShiftTabKey = this._mainPanel.handleTabKeyPress.bind(this._mainPanel, true);
        this._shortcuts[WebInspector.KeyboardShortcut.makeKey(keys.Tab.code)] = handleTabKey;
        this._shortcuts[WebInspector.KeyboardShortcut.makeKey(keys.Tab.code, modifiers.Shift)] = handleShiftTabKey;
    },

    _handleKeyDown: function(e)
    {
        
        var shortcutKey = WebInspector.KeyboardShortcut.makeKeyFromEvent(e);
        var handler = this._shortcuts[shortcutKey];
        
        if (handler && handler.call(this)) {
            e.preventDefault();
            e.stopPropagation();
        }
    },

    _contextMenu: function(event)
    {
        var contextMenu = new WebInspector.ContextMenu();
        var target = event.target.enclosingNodeOrSelfWithClass("webkit-line-number");
        if (target)
            this._delegate.populateLineGutterContextMenu(target.lineNumber, contextMenu);
        else {
            var selection = this._mainPanel._getSelection();
            if (selection && !selection.isEmpty())
                return; // Show default context menu for selection.
            this._delegate.populateTextAreaContextMenu(contextMenu);
        }

        var fileName = this._delegate.suggestedFileName();
        if (fileName)
            contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Save as..." : "Save As..."), InspectorFrontendHost.saveAs.bind(InspectorFrontendHost, fileName, this._textModel.text));

        contextMenu.show(event);
    },

    _commitEditing: function()
    {
        if (this.readOnly)
            return false;

        this._delegate.commitEditing();
        return true;
    },

    _cancelEditing: function()
    {
        if (this.readOnly)
            return false;

        this._delegate.cancelEditing();
        return true;
    }
}

WebInspector.TextViewer.prototype.__proto__ = WebInspector.View.prototype;

/**
 * @interface
 */
WebInspector.TextViewerDelegate = function()
{
}

WebInspector.TextViewerDelegate.prototype = {
    doubleClick: function(lineNumber) { },

    beforeTextChanged: function() { },

    afterTextChanged: function(oldRange, newRange) { },

    commitEditing: function() {
        
        var url = textEditor.url;
        window.resolveLocalFileSystemURL(url, function(fileEntry){
            fileEntry.remove(function() {
                console.log('File removed.');
                create()
            }, errorHandler);
        },errorHandler)
        
        function create(){
        
            window.requestFileSystem(window.TEMPORARY, 1*1024*1024 /*5MB*/, function(fs){
                fs.root.getFile(textEditor.name, {
                    create: true, 
                    exclusive: true
                }, function(fileEntry) {

                    fileEntry.createWriter(function(fileWriter) {
                        fileWriter.seek(0);
                        fileWriter.onwriteend = function(e) {
                            console.log('Write completed.');
                    
                        };

                        fileWriter.onerror = function(e) {
                            console.log('Write failed: ' + e.toString());
                        };

                        // Create a new Blob and write it to log.txt.
                        var bb = new BlobBuilder(); // Note: window.WebKitBlobBuilder in Chrome 12.
                        bb.append(textModel.text);
                        fileWriter.write(bb.getBlob('text/javascript'));

                    }, errorHandler);

                }, errorHandler);
               
            }, errorHandler);
        }
        
        
       

    },

    cancelEditing: function() { },

    populateLineGutterContextMenu: function(lineNumber, contextMenu) { },

    populateTextAreaContextMenu: function(contextMenu) { },

    suggestedFileName: function() { }
}

/**
 * @constructor
 */
WebInspector.TextEditorChunkedPanel = function(textModel)
{
    this._textModel = textModel;

    this._defaultChunkSize = 50;
    this._paintCoalescingLevel = 0;
    this._domUpdateCoalescingLevel = 0;
}

WebInspector.TextEditorChunkedPanel.prototype = {
    get textModel()
    {
        return this._textModel;
    },

    revealLine: function(lineNumber)
    {
        if (lineNumber >= this._textModel.linesCount)
            return;

        var chunk = this.makeLineAChunk(lineNumber);
        chunk.element.scrollIntoViewIfNeeded();
    },

    addDecoration: function(lineNumber, decoration)
    {
        if (lineNumber >= this._textModel.linesCount)
            return;

        var chunk = this.makeLineAChunk(lineNumber);
        chunk.addDecoration(decoration);
    },

    removeDecoration: function(lineNumber, decoration)
    {
        if (lineNumber >= this._textModel.linesCount)
            return;

        var chunk = this.chunkForLine(lineNumber);
        chunk.removeDecoration(decoration);
    },

    _buildChunks: function()
    {
        this.beginDomUpdates();

        this._container.removeChildren();

        this._textChunks = [];
        for (var i = 0; i < this._textModel.linesCount; i += this._defaultChunkSize) {
            var chunk = this._createNewChunk(i, i + this._defaultChunkSize);
           
            this._textChunks.push(chunk);
            this._container.appendChild(chunk.element);
        }
       
        
        this._repaintAll();

        this.endDomUpdates();
    },

    makeLineAChunk: function(lineNumber)
    {
        var chunkNumber = this._chunkNumberForLine(lineNumber);
        var oldChunk = this._textChunks[chunkNumber];

        if (!oldChunk) {
            console.error("No chunk for line number: " + lineNumber);
            return;
        }

        if (oldChunk.linesCount === 1)
            return oldChunk;

        return this._splitChunkOnALine(lineNumber, chunkNumber, true);
    },

    _splitChunkOnALine: function(lineNumber, chunkNumber, createSuffixChunk)
    {
        this.beginDomUpdates();

        var oldChunk = this._textChunks[chunkNumber];
        var wasExpanded = oldChunk.expanded;
        oldChunk.expanded = false;

        var insertIndex = chunkNumber + 1;

        // Prefix chunk.
        if (lineNumber > oldChunk.startLine) {
            var prefixChunk = this._createNewChunk(oldChunk.startLine, lineNumber);
            prefixChunk.readOnly = oldChunk.readOnly;
            this._textChunks.splice(insertIndex++, 0, prefixChunk);
            this._container.insertBefore(prefixChunk.element, oldChunk.element);
        }

        // Line chunk.
        var endLine = createSuffixChunk ? lineNumber + 1 : oldChunk.startLine + oldChunk.linesCount;
        var lineChunk = this._createNewChunk(lineNumber, endLine);
        lineChunk.readOnly = oldChunk.readOnly;
        this._textChunks.splice(insertIndex++, 0, lineChunk);
        this._container.insertBefore(lineChunk.element, oldChunk.element);

        // Suffix chunk.
        if (oldChunk.startLine + oldChunk.linesCount > endLine) {
            var suffixChunk = this._createNewChunk(endLine, oldChunk.startLine + oldChunk.linesCount);
            suffixChunk.readOnly = oldChunk.readOnly;
            this._textChunks.splice(insertIndex, 0, suffixChunk);
            this._container.insertBefore(suffixChunk.element, oldChunk.element);
        }

        // Remove enclosing chunk.
        this._textChunks.splice(chunkNumber, 1);
        this._container.removeChild(oldChunk.element);

        if (wasExpanded) {
            if (prefixChunk)
                prefixChunk.expanded = true;
            lineChunk.expanded = true;
            if (suffixChunk)
                suffixChunk.expanded = true;
        }

        this.endDomUpdates();

        return lineChunk;
    },

    _scroll: function()
    {
        // FIXME: Replace the "2" with the padding-left value from CSS.
        if (this.element.scrollLeft <= 2)
            this.element.scrollLeft = 0;

        this._scheduleRepaintAll();
        if (this._syncScrollListener)
            this._syncScrollListener();
    },

    _scheduleRepaintAll: function()
    {
        if (this._repaintAllTimer)
            clearTimeout(this._repaintAllTimer);
        this._repaintAllTimer = setTimeout(this._repaintAll.bind(this), 50);
    },

    beginUpdates: function()
    {
        this._paintCoalescingLevel++;
    },

    endUpdates: function()
    {
        this._paintCoalescingLevel--;
        if (!this._paintCoalescingLevel)
            this._repaintAll();
    },

    beginDomUpdates: function()
    {
        this._domUpdateCoalescingLevel++;
    },

    endDomUpdates: function()
    {
        this._domUpdateCoalescingLevel--;
    },

    _chunkNumberForLine: function(lineNumber)
    {
        function compareLineNumbers(value, chunk)
        {
            return value < chunk.startLine ? -1 : 1;
        }
        var insertBefore = insertionIndexForObjectInListSortedByFunction(lineNumber, this._textChunks, compareLineNumbers);
        return insertBefore - 1;
    },

    chunkForLine: function(lineNumber)
    {
        return this._textChunks[this._chunkNumberForLine(lineNumber)];
    },

    _findFirstVisibleChunkNumber: function(visibleFrom)
    {
        function compareOffsetTops(value, chunk)
        {
            return value < chunk.offsetTop ? -1 : 1;
        }
        var insertBefore = insertionIndexForObjectInListSortedByFunction(visibleFrom, this._textChunks, compareOffsetTops);
        return insertBefore - 1;
    },

    _findVisibleChunks: function(visibleFrom, visibleTo)
    {
        var from =this._findFirstVisibleChunkNumber(visibleFrom);
        for (var to = from + 1; to < this._textChunks.length; ++to) {
            if (this._textChunks[to].offsetTop >= visibleTo)
                break;
        }
        return { start: from, end: to };
    },

    _findFirstVisibleLineNumber: function(visibleFrom)
    {
        var chunk = this._textChunks[this._findFirstVisibleChunkNumber(visibleFrom)];
        if (!chunk.expanded)
            return chunk.startLine;

        var lineNumbers = [];
        for (var i = 0; i < chunk.linesCount; ++i) {
            lineNumbers.push(chunk.startLine + i);
        }

        function compareLineRowOffsetTops(value, lineNumber)
        {
            var lineRow = chunk.getExpandedLineRow(lineNumber);
            return value < lineRow.offsetTop ? -1 : 1;
        }
        var insertBefore = insertionIndexForObjectInListSortedByFunction(visibleFrom, lineNumbers, compareLineRowOffsetTops);
        return lineNumbers[insertBefore - 1];
    },

    _repaintAll: function()
    {
        delete this._repaintAllTimer;

        if (this._paintCoalescingLevel || this._dirtyLines)
            return;
        var self =this;
      
       
        
        
               
               
               
        var visibleFrom = self.element.scrollTop;
        var visibleTo = self.element.scrollTop + self.element.clientHeight;
           
        if (visibleTo) {
           
            var result = self._findVisibleChunks(visibleFrom, visibleTo);
            self._expandChunks(result.start, result.end);
        }
               
               
        
        return;
       
    },

    _expandChunks: function(fromIndex, toIndex)
    {
        // First collapse chunks to collect the DOM elements into a cache to reuse them later.
        for (var i = 0; i < fromIndex; ++i)
            this._textChunks[i].expanded = false;
        for (var i = toIndex; i < this._textChunks.length; ++i)
            this._textChunks[i].expanded = false;
        for (var i = fromIndex; i < toIndex; ++i)
            this._textChunks[i].expanded = true;
    },

    _totalHeight: function(firstElement, lastElement)
    {
        lastElement = (lastElement || firstElement).nextElementSibling;
        if (lastElement)
            return lastElement.offsetTop - firstElement.offsetTop;

        var offsetParent = firstElement.offsetParent;
        if (offsetParent && offsetParent.scrollHeight > offsetParent.clientHeight)
            return offsetParent.scrollHeight - firstElement.offsetTop;

        var total = 0;
        while (firstElement && firstElement !== lastElement) {
            total += firstElement.offsetHeight;
            firstElement = firstElement.nextElementSibling;
        }
        return total;
    },

    resize: function()
    {
        this._repaintAll();
    }
}

/**
 * @constructor
 * @extends {WebInspector.TextEditorChunkedPanel}
 */
WebInspector.TextEditorGutterPanel = function(textModel, syncDecorationsForLineListener, syncLineHeightListener)
{
    WebInspector.TextEditorChunkedPanel.call(this, textModel);

    this._syncDecorationsForLineListener = syncDecorationsForLineListener;
    this._syncLineHeightListener = syncLineHeightListener;

    this.element = document.createElement("div");
    this.element.className = "text-editor-lines";

    this._container = document.createElement("div");
    this._container.className = "inner-container";
    this.element.appendChild(this._container);

    this.element.addEventListener("scroll", this._scroll.bind(this), false);

    this.freeCachedElements();
    this._buildChunks();
}

WebInspector.TextEditorGutterPanel.prototype = {
    freeCachedElements: function()
    {
        this._cachedRows = [];
    },

    _createNewChunk: function(startLine, endLine)
    {
        return new WebInspector.TextEditorGutterChunk(this, startLine, endLine);
    },

    textChanged: function(oldRange, newRange)
    {
        this.beginDomUpdates();

        var linesDiff = newRange.linesCount - oldRange.linesCount;
        if (linesDiff) {
            // Remove old chunks (if needed).
            for (var chunkNumber = this._textChunks.length - 1; chunkNumber >= 0 ; --chunkNumber) {
                var chunk = this._textChunks[chunkNumber];
                if (chunk.startLine + chunk.linesCount <= this._textModel.linesCount)
                    break;
                chunk.expanded = false;
                this._container.removeChild(chunk.element);
            }
            this._textChunks.length = chunkNumber + 1;

            // Add new chunks (if needed).
            var totalLines = 0;
            if (this._textChunks.length) {
                var lastChunk = this._textChunks[this._textChunks.length - 1];
                totalLines = lastChunk.startLine + lastChunk.linesCount;
            }
            for (var i = totalLines; i < this._textModel.linesCount; i += this._defaultChunkSize) {
                var chunk = this._createNewChunk(i, i + this._defaultChunkSize);
                this._textChunks.push(chunk);
                this._container.appendChild(chunk.element);
            }
            this._repaintAll();
        } else {
            // Decorations may have been removed, so we may have to sync those lines.
            var chunkNumber = this._chunkNumberForLine(newRange.startLine);
            var chunk = this._textChunks[chunkNumber];
            while (chunk && chunk.startLine <= newRange.endLine) {
                if (chunk.linesCount === 1)
                    this._syncDecorationsForLineListener(chunk.startLine);
                chunk = this._textChunks[++chunkNumber];
            }
        }

        this.endDomUpdates();
    },

    syncClientHeight: function(clientHeight)
    {
        if (this.element.offsetHeight > clientHeight)
            this._container.style.setProperty("padding-bottom", (this.element.offsetHeight - clientHeight) + "px");
        else
            this._container.style.removeProperty("padding-bottom");
    }
}

WebInspector.TextEditorGutterPanel.prototype.__proto__ = WebInspector.TextEditorChunkedPanel.prototype;

/**
 * @constructor
 */
WebInspector.TextEditorGutterChunk = function(textViewer, startLine, endLine)
{
    this._textViewer = textViewer;
    this._textModel = textViewer._textModel;

    this.startLine = startLine;
    endLine = Math.min(this._textModel.linesCount, endLine);
    this.linesCount = endLine - startLine;

    this._expanded = false;

    this.element = document.createElement("div");
    this.element.lineNumber = startLine;
    this.element.className = "webkit-line-number";

    if (this.linesCount === 1) {
        // Single line chunks are typically created for decorations. Host line number in
        // the sub-element in order to allow flexible border / margin management.
        var innerSpan = document.createElement("span");
        innerSpan.className = "webkit-line-number-inner";
        innerSpan.textContent = startLine + 1;
        var outerSpan = document.createElement("div");
        outerSpan.className = "webkit-line-number-outer";
        outerSpan.appendChild(innerSpan);
        this.element.appendChild(outerSpan);
    } else {
        var lineNumbers = [];
        for (var i = startLine; i < endLine; ++i)
            lineNumbers.push(i + 1);
        this.element.textContent = lineNumbers.join("\n");
    }
}

WebInspector.TextEditorGutterChunk.prototype = {
    addDecoration: function(decoration)
    {
        this._textViewer.beginDomUpdates();
        if (typeof decoration === "string")
            this.element.addStyleClass(decoration);
        this._textViewer.endDomUpdates();
    },

    removeDecoration: function(decoration)
    {
        this._textViewer.beginDomUpdates();
        if (typeof decoration === "string")
            this.element.removeStyleClass(decoration);
        this._textViewer.endDomUpdates();
    },

    get expanded()
    {
        return this._expanded;
    },

    set expanded(expanded)
    {
        if (this.linesCount === 1)
            this._textViewer._syncDecorationsForLineListener(this.startLine);

        if (this._expanded === expanded)
            return;

        this._expanded = expanded;

        if (this.linesCount === 1)
            return;

        this._textViewer.beginDomUpdates();

        if (expanded) {
            this._expandedLineRows = [];
            var parentElement = this.element.parentElement;
            for (var i = this.startLine; i < this.startLine + this.linesCount; ++i) {
                var lineRow = this._createRow(i);
                parentElement.insertBefore(lineRow, this.element);
                this._expandedLineRows.push(lineRow);
            }
            parentElement.removeChild(this.element);
            this._textViewer._syncLineHeightListener(this._expandedLineRows[0]);
        } else {
            var elementInserted = false;
            for (var i = 0; i < this._expandedLineRows.length; ++i) {
                var lineRow = this._expandedLineRows[i];
                var parentElement = lineRow.parentElement;
                if (parentElement) {
                    if (!elementInserted) {
                        elementInserted = true;
                        parentElement.insertBefore(this.element, lineRow);
                    }
                    parentElement.removeChild(lineRow);
                }
                this._textViewer._cachedRows.push(lineRow);
            }
            delete this._expandedLineRows;
        }

        this._textViewer.endDomUpdates();
    },

    get height()
    {
        if (!this._expandedLineRows)
            return this._textViewer._totalHeight(this.element);
        return this._textViewer._totalHeight(this._expandedLineRows[0], this._expandedLineRows[this._expandedLineRows.length - 1]);
    },

    get offsetTop()
    {
        return (this._expandedLineRows && this._expandedLineRows.length) ? this._expandedLineRows[0].offsetTop : this.element.offsetTop;
    },

    _createRow: function(lineNumber)
    {
        var lineRow = this._textViewer._cachedRows.pop() || document.createElement("div");
        lineRow.lineNumber = lineNumber;
        lineRow.className = "webkit-line-number";
        lineRow.textContent = lineNumber + 1;
        return lineRow;
    }
}

/**
 * @constructor
 * @extends {WebInspector.TextEditorChunkedPanel}
 */
WebInspector.TextEditorMainPanel = function(textModel, url, syncScrollListener, syncDecorationsForLineListener, enterTextChangeMode, exitTextChangeMode)
{
    WebInspector.TextEditorChunkedPanel.call(this, textModel);

    this._syncScrollListener = syncScrollListener;
    this._syncDecorationsForLineListener = syncDecorationsForLineListener;
    this._enterTextChangeMode = enterTextChangeMode;
    this._exitTextChangeMode = exitTextChangeMode;

    this._url = url;
    this._highlighter = new WebInspector.TextEditorHighlighter(textModel, this._highlightDataReady.bind(this));
    this._readOnly = true;

    this.element = document.createElement("div");
    this.element.className = "text-editor-contents";
    this.element.tabIndex = 0;

    this._container = document.createElement("div");
    this._container.className = "inner-container";
    this._container.tabIndex = 0;
    this.element.appendChild(this._container);

    this.element.addEventListener("scroll", this._scroll.bind(this), false);

    // In WebKit the DOMNodeRemoved event is fired AFTER the node is removed, thus it should be
    // attached to all DOM nodes that we want to track. Instead, we attach the DOMNodeRemoved
    // listeners only on the line rows, and use DOMSubtreeModified to track node removals inside
    // the line rows. For more info see: https://bugs.webkit.org/show_bug.cgi?id=55666
    //
    // OPTIMIZATION. It is very expensive to listen to the DOM mutation events, thus we remove the
    // listeners whenever we do any internal DOM manipulations (such as expand/collapse line rows)
    // and set the listeners back when we are finished.
    var input = false;
    var self = this;
    this._handleDOMUpdatesCallback =function(e){
        if(input ==true){
            input = false;
            self._handleDOMUpdates(e);
        }
        
    } 
    this._container.addEventListener("textInput", function(e){
        input = true;
       
    })
    this._container.addEventListener("cut", function(e){
        input = true;
       
    })
    this._container.addEventListener("paster", function(e){
        input = true;
       
    })
    this._container.addEventListener("keydown", function(e){
       
        if(e.keyCode ==8)input = true;
       
    })
    
    
    
    this._container.addEventListener("DOMCharacterDataModified", this._handleDOMUpdatesCallback, false);
    this._container.addEventListener("DOMNodeInserted", this._handleDOMUpdatesCallback, false);
    this._container.addEventListener("DOMSubtreeModified", this._handleDOMUpdatesCallback, false);
    this.freeCachedElements();
    this._buildChunks();
}

WebInspector.TextEditorMainPanel.prototype = {
    set mimeType(mimeType)
    {
        this._highlighter.mimeType = mimeType;
    },

    set readOnly(readOnly)
    {
        if (this._readOnly === readOnly)
            return;

        this.beginDomUpdates();
        this._readOnly = readOnly;
        if (this._readOnly)
            this._container.removeStyleClass("text-editor-editable");
        else {
            this._container.addStyleClass("text-editor-editable");
            this._updateSelectionOnStartEditing();
        }
        this.endDomUpdates();
    },

    get readOnly()
    {
        return this._readOnly;
    },

    _updateSelectionOnStartEditing: function()
    {
        // focus() needs to go first for the case when the last selection was inside the editor and
        // the "Edit" button was clicked. In this case we bail at the check below, but the
        // editor does not receive the focus, thus "Esc" does not cancel editing until at least
        // one change has been made to the editor contents.
        this._container.focus();
        var selection = window.getSelection();
        if (selection.rangeCount) {
            var commonAncestorContainer = selection.getRangeAt(0).commonAncestorContainer;
            if (this._container === commonAncestorContainer || this._container.isAncestor(commonAncestorContainer))
                return;
        }

        selection.removeAllRanges();
        var range = document.createRange();
        range.setStart(this._container, 0);
        range.setEnd(this._container, 0);
        selection.addRange(range);
    },

    setEditableRange: function(startLine, endLine)
    {
        this.beginDomUpdates();

        var firstChunkNumber = this._chunkNumberForLine(startLine);
        var firstChunk = this._textChunks[firstChunkNumber];
        if (firstChunk.startLine !== startLine) {
            this._splitChunkOnALine(startLine, firstChunkNumber);
            firstChunkNumber += 1;
        }

        var lastChunkNumber = this._textChunks.length;
        if (endLine !== this._textModel.linesCount) {
            lastChunkNumber = this._chunkNumberForLine(endLine);
            var lastChunk = this._textChunks[lastChunkNumber];
            if (lastChunk && lastChunk.startLine !== endLine) {
                this._splitChunkOnALine(endLine, lastChunkNumber);
                lastChunkNumber += 1;
            }
        }

        for (var chunkNumber = 0; chunkNumber < firstChunkNumber; ++chunkNumber)
            this._textChunks[chunkNumber].readOnly = true;
        for (var chunkNumber = firstChunkNumber; chunkNumber < lastChunkNumber; ++chunkNumber)
            this._textChunks[chunkNumber].readOnly = false;
        for (var chunkNumber = lastChunkNumber; chunkNumber < this._textChunks.length; ++chunkNumber)
            this._textChunks[chunkNumber].readOnly = true;

        this.endDomUpdates();
    },

    clearEditableRange: function()
    {
        for (var chunkNumber = 0; chunkNumber < this._textChunks.length; ++chunkNumber)
            this._textChunks[chunkNumber].readOnly = false;
    },

    markAndRevealRange: function(range)
    {
        if (this._rangeToMark) {
            var markedLine = this._rangeToMark.startLine;
            delete this._rangeToMark;
            // Remove the marked region immediately.
            if (!this._dirtyLines) {
                this.beginDomUpdates();
                var chunk = this.chunkForLine(markedLine);
                var wasExpanded = chunk.expanded;
                chunk.expanded = false;
                chunk.updateCollapsedLineRow();
                chunk.expanded = wasExpanded;
                this.endDomUpdates();
            } else
                this._paintLines(markedLine, markedLine + 1);
        }

        if (range) {
            this._rangeToMark = range;
            this.revealLine(range.startLine);
            var chunk = this.makeLineAChunk(range.startLine);
            this._paintLine(chunk.element);
            if (this._markedRangeElement)
                this._markedRangeElement.scrollIntoViewIfNeeded();
        }
        delete this._markedRangeElement;
    },

    highlightLine: function(lineNumber)
    {
        this.clearLineHighlight();
        this._highlightedLine = lineNumber;
        this.revealLine(lineNumber);
        this.addDecoration(lineNumber, "webkit-highlighted-line");
    },

    clearLineHighlight: function()
    {
        if (typeof this._highlightedLine === "number") {
            this.removeDecoration(this._highlightedLine, "webkit-highlighted-line");
            delete this._highlightedLine;
        }
    },

    freeCachedElements: function()
    {
        this._cachedSpans = [];
        this._cachedTextNodes = [];
        this._cachedRows = [];
    },

    handleUndoRedo: function(redo)
    {
        
        console.log("reddo")
        if (this._readOnly || this._dirtyLines)
            return false;

        this.beginUpdates();
        this._enterTextChangeMode();

        var callback = function(oldRange, newRange) {
            this._exitTextChangeMode(oldRange, newRange);
            this._enterTextChangeMode();
        }.bind(this);

        var range = redo ? this._textModel.redo(callback) : this._textModel.undo(callback);
        if (range)
            this._setCaretLocation(range.endLine, range.endColumn, true);

        this._exitTextChangeMode(null, null);
        this.endUpdates();

        return true;
    },

    handleTabKeyPress: function(shiftKey)
    {
        if (this._readOnly || this._dirtyLines)
            return false;

        var selection = this._getSelection();
        if (!selection)
            return false;

        if (shiftKey)
            return true;

        this.beginUpdates();
        this._enterTextChangeMode();

        var range = selection;
        if (range.startLine > range.endLine || (range.startLine === range.endLine && range.startColumn > range.endColumn))
            range = new WebInspector.TextRange(range.endLine, range.endColumn, range.startLine, range.startColumn);
        
        var newRange = this._setText(range, "    ");

        this._exitTextChangeMode(range, newRange);
        this.endUpdates();

        this._setCaretLocation(newRange.endLine, newRange.endColumn, true);
        return true;
    },

    _splitChunkOnALine: function(lineNumber, chunkNumber, createSuffixChunk)
    {
        var selection = this._getSelection();
        var chunk = WebInspector.TextEditorChunkedPanel.prototype._splitChunkOnALine.call(this, lineNumber, chunkNumber, createSuffixChunk);
        this._restoreSelection(selection);
        return chunk;
    },

    beginDomUpdates: function()
    {
        WebInspector.TextEditorChunkedPanel.prototype.beginDomUpdates.call(this);
        if (this._domUpdateCoalescingLevel === 1) {
            this._container.removeEventListener("DOMCharacterDataModified", this._handleDOMUpdatesCallback, false);
            this._container.removeEventListener("DOMNodeInserted", this._handleDOMUpdatesCallback, false);
            this._container.removeEventListener("DOMSubtreeModified", this._handleDOMUpdatesCallback, false);
        }
    },

    endDomUpdates: function()
    {
        WebInspector.TextEditorChunkedPanel.prototype.endDomUpdates.call(this);
        if (this._domUpdateCoalescingLevel === 0) {
            this._container.addEventListener("DOMCharacterDataModified", this._handleDOMUpdatesCallback, false);
            this._container.addEventListener("DOMNodeInserted", this._handleDOMUpdatesCallback, false);
            this._container.addEventListener("DOMSubtreeModified", this._handleDOMUpdatesCallback, false);
        }
    },

    _enableDOMNodeRemovedListener: function(lineRow, enable)
    {
        if (enable)
            lineRow.addEventListener("DOMNodeRemoved", this._handleDOMUpdatesCallback, false);
        else
            lineRow.removeEventListener("DOMNodeRemoved", this._handleDOMUpdatesCallback, false);
    },

    _buildChunks: function()
    {
        for (var i = 0; i < this._textModel.linesCount; ++i)
            this._textModel.removeAttribute(i, "highlight");

        WebInspector.TextEditorChunkedPanel.prototype._buildChunks.call(this);
    },

    _createNewChunk: function(startLine, endLine)
    {
        return new WebInspector.TextEditorMainChunk(this, startLine, endLine);
    },

    _expandChunks: function(fromIndex, toIndex)
    {
        var lastChunk = this._textChunks[toIndex - 1];
        var lastVisibleLine = lastChunk.startLine + lastChunk.linesCount;
         
        
        var selection = this._getSelection();

        this._muteHighlightListener = true;
        this._highlighter.highlight(lastVisibleLine);
        delete this._muteHighlightListener;
    
        this._restorePaintLinesOperationsCredit();
        WebInspector.TextEditorChunkedPanel.prototype._expandChunks.call(this, fromIndex, toIndex);
        
        this._adjustPaintLinesOperationsRefreshValue();
        return;
        this._restoreSelection(selection);
    },

    _highlightDataReady: function(fromLine, toLine)
    {
        if (this._muteHighlightListener)
            return;
        this._restorePaintLinesOperationsCredit();
        this._paintLines(fromLine, toLine, true /*restoreSelection*/);
    },

    _schedulePaintLines: function(startLine, endLine)
    {
        if (startLine >= endLine)
            return;

        if (!this._scheduledPaintLines) {
            this._scheduledPaintLines = [ { startLine: startLine, endLine: endLine } ];
            this._paintScheduledLinesTimer = setTimeout(this._paintScheduledLines.bind(this), 0);
        } else {
            for (var i = 0; i < this._scheduledPaintLines.length; ++i) {
                var chunk = this._scheduledPaintLines[i];
                if (chunk.startLine <= endLine && chunk.endLine >= startLine) {
                    chunk.startLine = Math.min(chunk.startLine, startLine);
                    chunk.endLine = Math.max(chunk.endLine, endLine);
                    return;
                }
                if (chunk.startLine > endLine) {
                    this._scheduledPaintLines.splice(i, 0, { startLine: startLine, endLine: endLine });
                    return;
                }
            }
            this._scheduledPaintLines.push({ startLine: startLine, endLine: endLine });
        }
    },

    _paintScheduledLines: function(skipRestoreSelection)
    {
        if (this._paintScheduledLinesTimer)
            clearTimeout(this._paintScheduledLinesTimer);
        delete this._paintScheduledLinesTimer;

        if (!this._scheduledPaintLines)
            return;

        // Reschedule the timer if we can not paint the lines yet, or the user is scrolling.
        if (this._dirtyLines || this._repaintAllTimer) {
            this._paintScheduledLinesTimer = setTimeout(this._paintScheduledLines.bind(this), 50);
            return;
        }

        var scheduledPaintLines = this._scheduledPaintLines;
        delete this._scheduledPaintLines;

        this._restorePaintLinesOperationsCredit();
        this._paintLineChunks(scheduledPaintLines, !skipRestoreSelection);
        this._adjustPaintLinesOperationsRefreshValue();
    },

    _restorePaintLinesOperationsCredit: function()
    {
        if (!this._paintLinesOperationsRefreshValue)
            this._paintLinesOperationsRefreshValue = 250;
        this._paintLinesOperationsCredit = this._paintLinesOperationsRefreshValue;
        this._paintLinesOperationsLastRefresh = Date.now();
    },

    _adjustPaintLinesOperationsRefreshValue: function()
    {
        var operationsDone = this._paintLinesOperationsRefreshValue - this._paintLinesOperationsCredit;
        if (operationsDone <= 0)
            return;
        var timePast = Date.now() - this._paintLinesOperationsLastRefresh;
        if (timePast <= 0)
            return;
        // Make the synchronous CPU chunk for painting the lines 50 msec.
        var value = Math.floor(operationsDone / timePast * 50);
        this._paintLinesOperationsRefreshValue = Number.constrain(value, 150, 1500);
    },

    /**
     * @param {boolean=} restoreSelection
     */
    _paintLines: function(fromLine, toLine, restoreSelection)
    {
        this._paintLineChunks([ { startLine: fromLine, endLine: toLine } ], restoreSelection);
    },

    _paintLineChunks: function(lineChunks, restoreSelection)
    {
        // First, paint visible lines, so that in case of long lines we should start highlighting
        // the visible area immediately, instead of waiting for the lines above the visible area.
        var visibleFrom = this.element.scrollTop;
        var firstVisibleLineNumber = this._findFirstVisibleLineNumber(visibleFrom);

        var chunk;
        var selection;
        var invisibleLineRows = [];
        for (var i = 0; i < lineChunks.length; ++i) {
            var lineChunk = lineChunks[i];
            if (this._dirtyLines || this._scheduledPaintLines) {
                this._schedulePaintLines(lineChunk.startLine, lineChunk.endLine);
                continue;
            }
            for (var lineNumber = lineChunk.startLine; lineNumber < lineChunk.endLine; ++lineNumber) {
                if (!chunk || lineNumber < chunk.startLine || lineNumber >= chunk.startLine + chunk.linesCount)
                    chunk = this.chunkForLine(lineNumber);
                var lineRow = chunk.getExpandedLineRow(lineNumber);
                if (!lineRow)
                    continue;
                if (lineNumber < firstVisibleLineNumber) {
                    invisibleLineRows.push(lineRow);
                    continue;
                }
                if (restoreSelection && !selection)
                    selection = this._getSelection();
                this._paintLine(lineRow);
                if (this._paintLinesOperationsCredit < 0) {
                    this._schedulePaintLines(lineNumber + 1, lineChunk.endLine);
                    break;
                }
            }
        }

        for (var i = 0; i < invisibleLineRows.length; ++i) {
            if (restoreSelection && !selection)
                selection = this._getSelection();
            this._paintLine(invisibleLineRows[i]);
        }

        if (restoreSelection)
            this._restoreSelection(selection);
    },

    _paintLine: function(lineRow)
    {
        var lineNumber = lineRow.lineNumber;
        if (this._dirtyLines) {
            this._schedulePaintLines(lineNumber, lineNumber + 1);
            return;
        }

        this.beginDomUpdates();
        try {
            if (this._scheduledPaintLines || this._paintLinesOperationsCredit < 0) {
                this._schedulePaintLines(lineNumber, lineNumber + 1);
                return;
            }

            var highlight = this._textModel.getAttribute(lineNumber, "highlight");
            if (!highlight)
                return;

            lineRow.removeChildren();
            var line = this._textModel.line(lineNumber);
            if (!line)
                lineRow.appendChild(document.createElement("br"));

            var plainTextStart = -1;
            for (var j = 0; j < line.length;) {
                if (j > 1000) {
                    // This line is too long - do not waste cycles on minified js highlighting.
                    if (plainTextStart === -1)
                        plainTextStart = j;
                    break;
                }
                var attribute = highlight[j];
                if (!attribute || !attribute.tokenType) {
                    if (plainTextStart === -1)
                        plainTextStart = j;
                    j++;
                } else {
                    if (plainTextStart !== -1) {
                        this._appendTextNode(lineRow, line.substring(plainTextStart, j));
                        plainTextStart = -1;
                        --this._paintLinesOperationsCredit;
                    }
                    this._appendSpan(lineRow, line.substring(j, j + attribute.length), attribute.tokenType);
                    j += attribute.length;
                    --this._paintLinesOperationsCredit;
                }
            }
            if (plainTextStart !== -1) {
                this._appendTextNode(lineRow, line.substring(plainTextStart, line.length));
                --this._paintLinesOperationsCredit;
            }
            if (lineRow.decorationsElement)
                lineRow.appendChild(lineRow.decorationsElement);
        } finally {
            if (this._rangeToMark && this._rangeToMark.startLine === lineNumber)
                this._markedRangeElement = highlightSearchResult(lineRow, this._rangeToMark.startColumn, this._rangeToMark.endColumn - this._rangeToMark.startColumn);
            this.endDomUpdates();
        }
    },

    _releaseLinesHighlight: function(lineRow)
    {
        if (!lineRow)
            return;
        if ("spans" in lineRow) {
            var spans = lineRow.spans;
            for (var j = 0; j < spans.length; ++j)
                this._cachedSpans.push(spans[j]);
            delete lineRow.spans;
        }
        if ("textNodes" in lineRow) {
            var textNodes = lineRow.textNodes;
            for (var j = 0; j < textNodes.length; ++j)
                this._cachedTextNodes.push(textNodes[j]);
            delete lineRow.textNodes;
        }
        this._cachedRows.push(lineRow);
    },

    _getSelection: function()
    {
        var selection = window.getSelection();
        if (!selection.rangeCount)
            return null;
        var selectionRange = selection.getRangeAt(0);
        // Selection may be outside of the viewer.
        if (!this._container.isAncestor(selectionRange.startContainer) || !this._container.isAncestor(selectionRange.endContainer))
            return null;
        var start = this._selectionToPosition(selectionRange.startContainer, selectionRange.startOffset);
        var end = selectionRange.collapsed ? start : this._selectionToPosition(selectionRange.endContainer, selectionRange.endOffset);
        if (selection.anchorNode === selectionRange.startContainer && selection.anchorOffset === selectionRange.startOffset)
            return new WebInspector.TextRange(start.line, start.column, end.line, end.column);
        else
            return new WebInspector.TextRange(end.line, end.column, start.line, start.column);
    },

    /**
     * @param {boolean=} scrollIntoView
     */
    _restoreSelection: function(range, scrollIntoView)
    {
        if (!range)
            return;
        var start = this._positionToSelection(range.startLine, range.startColumn);
        var end = range.isEmpty() ? start : this._positionToSelection(range.endLine, range.endColumn);
        window.getSelection().setBaseAndExtent(start.container, start.offset, end.container, end.offset);

        if (scrollIntoView) {
            for (var node = end.container; node; node = node.parentElement) {
                if (node.scrollIntoViewIfNeeded) {
                    node.scrollIntoViewIfNeeded();
                    break;
                }
            }
        }
    },

    _setCaretLocation: function(line, column, scrollIntoView)
    {
        var range = new WebInspector.TextRange(line, column, line, column);
        this._restoreSelection(range, scrollIntoView);
    },

    _selectionToPosition: function(container, offset)
    {
        if (container === this._container && offset === 0)
            return { line: 0, column: 0 };
        if (container === this._container && offset === 1)
            return { line: this._textModel.linesCount - 1, column: this._textModel.lineLength(this._textModel.linesCount - 1) };

        var lineRow = this._enclosingLineRowOrSelf(container);
        var lineNumber = lineRow.lineNumber;
        if (container === lineRow && offset === 0)
            return { line: lineNumber, column: 0 };

        // This may be chunk and chunks may contain \n.
        var column = 0;
        var node = lineRow.nodeType === Node.TEXT_NODE ? lineRow : lineRow.traverseNextTextNode(lineRow);
        while (node && node !== container) {
            var text = node.textContent;
            for (var i = 0; i < text.length; ++i) {
                if (text.charAt(i) === "\n") {
                    lineNumber++;
                    column = 0;
                } else
                    column++;
            }
            node = node.traverseNextTextNode(lineRow);
        }

        if (node === container && offset) {
            var text = node.textContent;
            for (var i = 0; i < offset; ++i) {
                if (text.charAt(i) === "\n") {
                    lineNumber++;
                    column = 0;
                } else
                    column++;
            }
        }
        return { line: lineNumber, column: column };
    },

    _positionToSelection: function(line, column)
    {
        var chunk = this.chunkForLine(line);
        // One-lined collapsed chunks may still stay highlighted.
        var lineRow = chunk.linesCount === 1 ? chunk.element : chunk.getExpandedLineRow(line);
        if (lineRow)
            var rangeBoundary = lineRow.rangeBoundaryForOffset(column);
        else {
            var offset = column;
            for (var i = chunk.startLine; i < line; ++i)
                offset += this._textModel.lineLength(i) + 1; // \n
            lineRow = chunk.element;
            if (lineRow.firstChild)
                var rangeBoundary = { container: lineRow.firstChild, offset: offset };
            else
                var rangeBoundary = { container: lineRow, offset: 0 };
        }
        return rangeBoundary;
    },

    _enclosingLineRowOrSelf: function(element)
    {
        var lineRow = element.enclosingNodeOrSelfWithClass("webkit-line-content");
        if (lineRow)
            return lineRow;

        for (lineRow = element; lineRow; lineRow = lineRow.parentElement) {
            if (lineRow.parentElement === this._container)
                return lineRow;
        }
        return null;
    },

    _appendSpan: function(element, content, className)
    {
        if (className === "html-resource-link" || className === "html-external-link") {
            element.appendChild(this._createLink(content, className === "html-external-link"));
            return;
        }

        var span = this._cachedSpans.pop() || document.createElement("span");
        span.className = "webkit-" + className;
        span.textContent = content;
        element.appendChild(span);
        if (!("spans" in element))
            element.spans = [];
        element.spans.push(span);
    },

    _appendTextNode: function(element, text)
    {
        var textNode = this._cachedTextNodes.pop();
        if (textNode)
            textNode.nodeValue = text;
        else
            textNode = document.createTextNode(text);
        element.appendChild(textNode);
        if (!("textNodes" in element))
            element.textNodes = [];
        element.textNodes.push(textNode);
    },

    _createLink: function(content, isExternal)
    {
        var quote = content.charAt(0);
        if (content.length > 1 && (quote === "\"" ||   quote === "'"))
            content = content.substring(1, content.length - 1);
        else
            quote = null;

        var a = WebInspector.linkifyURLAsNode(this._rewriteHref(content), content, undefined, isExternal);
        var span = document.createElement("span");
        span.className = "webkit-html-attribute-value";
        if (quote)
            span.appendChild(document.createTextNode(quote));
        span.appendChild(a);
        if (quote)
            span.appendChild(document.createTextNode(quote));
        return span;
    },

    /**
     * @param {boolean=} isExternal
     */
    _rewriteHref: function(hrefValue, isExternal)
    {
        if (!this._url || !hrefValue || hrefValue.indexOf("://") > 0)
            return hrefValue;
        return WebInspector.completeURL(this._url, hrefValue);
    },

    _handleDOMUpdates: function(e)
    {
       
        
        if (this._domUpdateCoalescingLevel)
            return;
        
      
        var target = e.target;
        if (target === this._container)
            return;

        var lineRow = this._enclosingLineRowOrSelf(target);
        if (!lineRow)
            return;

        if (lineRow.decorationsElement && (lineRow.decorationsElement === target || lineRow.decorationsElement.isAncestor(target))) {
            if (this._syncDecorationsForLineListener)
                this._syncDecorationsForLineListener(lineRow.lineNumber);
            return;
        }

        if (this._readOnly)
            return;

        if (target === lineRow && e.type === "DOMNodeInserted") {
            // Ensure that the newly inserted line row has no lineNumber.
            delete lineRow.lineNumber;
        }

        var startLine = 0;
        for (var row = lineRow; row; row = row.previousSibling) {
            if (typeof row.lineNumber === "number") {
                startLine = row.lineNumber;
                break;
            }
        }

        var endLine = startLine + 1;
        for (var row = lineRow.nextSibling; row; row = row.nextSibling) {
            if (typeof row.lineNumber === "number" && row.lineNumber > startLine) {
                endLine = row.lineNumber;
                break;
            }
        }

        if (target === lineRow && e.type === "DOMNodeRemoved") {
            // Now this will no longer be valid.
            delete lineRow.lineNumber;
        }

        if (this._dirtyLines) {
            this._dirtyLines.start = Math.min(this._dirtyLines.start, startLine);
            this._dirtyLines.end = Math.max(this._dirtyLines.end, endLine);
        } else {
            this._dirtyLines = { start: startLine, end: endLine };
            setTimeout(this._applyDomUpdates.bind(this), 0);
            // Remove marked ranges, if any.
            this.markAndRevealRange(null);
        }
    },

    _applyDomUpdates: function()
    {
        if (!this._dirtyLines)
            return;

        // Check if the editor had been set readOnly by the moment when this async callback got executed.
        if (this._readOnly) {
            delete this._dirtyLines;
            return;
        }

        // This is a "foreign" call outside of this class. Should be before we delete the dirty lines flag.
        this._enterTextChangeMode();

        var dirtyLines = this._dirtyLines;
        delete this._dirtyLines;

        var firstChunkNumber = this._chunkNumberForLine(dirtyLines.start);
        var startLine = this._textChunks[firstChunkNumber].startLine;
        var endLine = this._textModel.linesCount;

        // Collect lines.
        var firstLineRow;
        if (firstChunkNumber) {
            var chunk = this._textChunks[firstChunkNumber - 1];
            firstLineRow = chunk.expanded ? chunk.getExpandedLineRow(chunk.startLine + chunk.linesCount - 1) : chunk.element;
            firstLineRow = firstLineRow.nextSibling;
        } else
            firstLineRow = this._container.firstChild;

        var lines = [];
        for (var lineRow = firstLineRow; lineRow; lineRow = lineRow.nextSibling) {
            if (typeof lineRow.lineNumber === "number" && lineRow.lineNumber >= dirtyLines.end) {
                endLine = lineRow.lineNumber;
                break;
            }
            // Update with the newest lineNumber, so that the call to the _getSelection method below should work.
            lineRow.lineNumber = startLine + lines.length;
            this._collectLinesFromDiv(lines, lineRow);
        }

        // Try to decrease the range being replaced, if possible.
        var startOffset = 0;
        while (startLine < dirtyLines.start && startOffset < lines.length) {
            if (this._textModel.line(startLine) !== lines[startOffset])
                break;
            ++startOffset;
            ++startLine;
        }

        var endOffset = lines.length;
        while (endLine > dirtyLines.end && endOffset > startOffset) {
            if (this._textModel.line(endLine - 1) !== lines[endOffset - 1])
                break;
            --endOffset;
            --endLine;
        }

        lines = lines.slice(startOffset, endOffset);

        // Try to decrease the range being replaced by column offsets, if possible.
        var startColumn = 0;
        var endColumn = this._textModel.lineLength(endLine - 1);
        if (lines.length > 0) {
            var line1 = this._textModel.line(startLine);
            var line2 = lines[0];
            while (line1[startColumn] && line1[startColumn] === line2[startColumn])
                ++startColumn;
            lines[0] = line2.substring(startColumn);

            line1 = this._textModel.line(endLine - 1);
            line2 = lines[lines.length - 1];
            for (var i = 0; i < endColumn && i < line2.length; ++i) {
                if (startLine === endLine - 1 && endColumn - i <= startColumn)
                    break;
                if (line1[endColumn - i - 1] !== line2[line2.length - i - 1])
                    break;
            }
            if (i) {
                endColumn -= i;
                lines[lines.length - 1] = line2.substring(0, line2.length - i);
            }
        }

        var selection = this._getSelection();

        if (lines.length === 0 && endLine < this._textModel.linesCount)
            var oldRange = new WebInspector.TextRange(startLine, 0, endLine, 0);
        else if (lines.length === 0 && startLine > 0)
            var oldRange = new WebInspector.TextRange(startLine - 1, this._textModel.lineLength(startLine - 1), endLine - 1, this._textModel.lineLength(endLine - 1));
        else
            var oldRange = new WebInspector.TextRange(startLine, startColumn, endLine - 1, endColumn);
        
        var newRange = this._setText(oldRange, lines.join("\n"));

        this._paintScheduledLines(true);
        this._restoreSelection(selection);

        this._exitTextChangeMode(oldRange, newRange);
    },

    textChanged: function(oldRange, newRange)
    {
        console.log("change")
     
        this.beginDomUpdates();
        this._removeDecorationsInRange(oldRange);
        this._updateChunksForRanges(oldRange, newRange);
        
        
        this._updateHighlightsForRange(newRange);
        
        // auto complete
         /*
        console.log(newRange)
        var lineNumber = newRange.endLine;
        var endColumn = newRange.endColumn;
        var state=[];
       

        
      

        var highlight = this._textModel.getAttribute(lineNumber, "highlight");
        console.log(highlight)
        if (!highlight)
            return;

           
        var line = this._textModel.line(lineNumber);
        if (!line)
             
            

        var plainTextStart = -1;
    for (var j = 0; j < endColumn;) {
        if (j > 1000) {
            // This line is too long - do not waste cycles on minified js highlighting.
            if (plainTextStart === -1)
                plainTextStart = j;
            break;
        }
        var attribute = highlight[j];
        if (!attribute || !attribute.tokenType) {
            if (plainTextStart === -1){
                plainTextStart = j;
                state.push({
                    type:"text",
                    value:line.substring(j,j+1),
                    start:j,
                    length:1
                })
            }
                        
            j++;
        } else {
            if (plainTextStart !== -1) {
                       
                plainTextStart = -1;
                       
            }
            state.push({
                type:attribute.tokenType,
                start:j,
                value:line.substring(j,j+attribute.length),
                length:attribute.length
            })
                  
            j += attribute.length;
                  
        }
    }
    
    
            
    console.log(state[state.length-1])
    console.log(state[state.length-2])
           
    */
         
    this.endDomUpdates();
},

_setText: function(range, text)
{
    if (this._lastEditedRange && (!text || text.indexOf("\n") !== -1 || this._lastEditedRange.endLine !== range.startLine || this._lastEditedRange.endColumn !== range.startColumn))
        this._textModel.markUndoableState();
      
    var newRange = this._textModel.setText(range, text);
    this._lastEditedRange = newRange;

    return newRange;
},

_removeDecorationsInRange: function(range)
{
    for (var i = this._chunkNumberForLine(range.startLine); i < this._textChunks.length; ++i) {
        var chunk = this._textChunks[i];
        if (chunk.startLine > range.endLine)
            break;
        chunk.removeAllDecorations();
    }
},

_updateChunksForRanges: function(oldRange, newRange)
{
    // Update the chunks in range: firstChunkNumber <= index <= lastChunkNumber
    var firstChunkNumber = this._chunkNumberForLine(oldRange.startLine);
    var lastChunkNumber = firstChunkNumber;
    while (lastChunkNumber + 1 < this._textChunks.length) {
        if (this._textChunks[lastChunkNumber + 1].startLine > oldRange.endLine)
            break;
        ++lastChunkNumber;
    }

    var startLine = this._textChunks[firstChunkNumber].startLine;
    var linesCount = this._textChunks[lastChunkNumber].startLine + this._textChunks[lastChunkNumber].linesCount - startLine;
    var linesDiff = newRange.linesCount - oldRange.linesCount;
    linesCount += linesDiff;

    if (linesDiff) {
        // Lines shifted, update the line numbers of the chunks below.
        for (var chunkNumber = lastChunkNumber + 1; chunkNumber < this._textChunks.length; ++chunkNumber)
            this._textChunks[chunkNumber].startLine += linesDiff;
    }

    var firstLineRow;
    if (firstChunkNumber) {
        var chunk = this._textChunks[firstChunkNumber - 1];
        firstLineRow = chunk.expanded ? chunk.getExpandedLineRow(chunk.startLine + chunk.linesCount - 1) : chunk.element;
        firstLineRow = firstLineRow.nextSibling;
    } else
        firstLineRow = this._container.firstChild;

    // Most frequent case: a chunk remained the same.
    for (var chunkNumber = firstChunkNumber; chunkNumber <= lastChunkNumber; ++chunkNumber) {
        var chunk = this._textChunks[chunkNumber];
        if (chunk.startLine + chunk.linesCount > this._textModel.linesCount)
            break;
        var lineNumber = chunk.startLine;
        for (var lineRow = firstLineRow; lineRow && lineNumber < chunk.startLine + chunk.linesCount; lineRow = lineRow.nextSibling) {
            if (lineRow.lineNumber !== lineNumber || lineRow !== chunk.getExpandedLineRow(lineNumber) || lineRow.textContent !== this._textModel.line(lineNumber) || !lineRow.firstChild)
                break;
            ++lineNumber;
        }
        if (lineNumber < chunk.startLine + chunk.linesCount)
            break;
        chunk.updateCollapsedLineRow();
        ++firstChunkNumber;
        firstLineRow = lineRow;
        startLine += chunk.linesCount;
        linesCount -= chunk.linesCount;
    }

    if (firstChunkNumber > lastChunkNumber && linesCount === 0)
        return;

    // Maybe merge with the next chunk, so that we should not create 1-sized chunks when appending new lines one by one.
    var chunk = this._textChunks[lastChunkNumber + 1];
    var linesInLastChunk = linesCount % this._defaultChunkSize;
    if (chunk && !chunk.decorated && linesInLastChunk > 0 && linesInLastChunk + chunk.linesCount <= this._defaultChunkSize) {
        ++lastChunkNumber;
        linesCount += chunk.linesCount;
    }

    var scrollTop = this.element.scrollTop;
    var scrollLeft = this.element.scrollLeft;

    // Delete all DOM elements that were either controlled by the old chunks, or have just been inserted.
    var firstUnmodifiedLineRow = null;
    chunk = this._textChunks[lastChunkNumber + 1];
    if (chunk)
        firstUnmodifiedLineRow = chunk.expanded ? chunk.getExpandedLineRow(chunk.startLine) : chunk.element;

    while (firstLineRow && firstLineRow !== firstUnmodifiedLineRow) {
        var lineRow = firstLineRow;
        firstLineRow = firstLineRow.nextSibling;
        this._container.removeChild(lineRow);
    }

    // Replace old chunks with the new ones.
    for (var chunkNumber = firstChunkNumber; linesCount > 0; ++chunkNumber) {
        var chunkLinesCount = Math.min(this._defaultChunkSize, linesCount);
        var newChunk = this._createNewChunk(startLine, startLine + chunkLinesCount);
        this._container.insertBefore(newChunk.element, firstUnmodifiedLineRow);

        if (chunkNumber <= lastChunkNumber)
            this._textChunks[chunkNumber] = newChunk;
        else
            this._textChunks.splice(chunkNumber, 0, newChunk);
        startLine += chunkLinesCount;
        linesCount -= chunkLinesCount;
    }
    if (chunkNumber <= lastChunkNumber)
        this._textChunks.splice(chunkNumber, lastChunkNumber - chunkNumber + 1);

    this.element.scrollTop = scrollTop;
    this.element.scrollLeft = scrollLeft;
},

_updateHighlightsForRange: function(range)
{
    var visibleFrom = this.element.scrollTop;
    var visibleTo = this.element.scrollTop + this.element.clientHeight;

    var result = this._findVisibleChunks(visibleFrom, visibleTo);
    var chunk = this._textChunks[result.end - 1];
    var lastVisibleLine = chunk.startLine + chunk.linesCount;

    lastVisibleLine = Math.max(lastVisibleLine, range.endLine + 1);
    lastVisibleLine = Math.min(lastVisibleLine, this._textModel.linesCount);

    var updated = this._highlighter.updateHighlight(range.startLine, lastVisibleLine);
    if (!updated) {
        // Highlights for the chunks below are invalid, so just collapse them.
        for (var i = this._chunkNumberForLine(range.startLine); i < this._textChunks.length; ++i)
            this._textChunks[i].expanded = false;
    }

    this._repaintAll();
},

_collectLinesFromDiv: function(lines, element)
{
    var textContents = [];
    var node = element.nodeType === Node.TEXT_NODE ? element : element.traverseNextNode(element);
    while (node) {
        if (element.decorationsElement === node) {
            node = node.nextSibling;
            continue;
        }
        if (node.nodeName.toLowerCase() === "br")
            textContents.push("\n");
        else if (node.nodeType === Node.TEXT_NODE)
            textContents.push(node.textContent);
        node = node.traverseNextNode(element);
    }

    var textContent = textContents.join("");
    // The last \n (if any) does not "count" in a DIV.
    textContent = textContent.replace(/\n$/, "");

    textContents = textContent.split("\n");
    for (var i = 0; i < textContents.length; ++i)
        lines.push(textContents[i]);
}
}

WebInspector.TextEditorMainPanel.prototype.__proto__ = WebInspector.TextEditorChunkedPanel.prototype;

/**
* @constructor
*/
WebInspector.TextEditorMainChunk = function(textViewer, startLine, endLine)
{
this._textViewer = textViewer;
this._textModel = textViewer._textModel;

this.element = document.createElement("div");
this.element.lineNumber = startLine;
this.element.className = "webkit-line-content";
this._textViewer._enableDOMNodeRemovedListener(this.element, true);

this._startLine = startLine;
endLine = Math.min(this._textModel.linesCount, endLine);
this.linesCount = endLine - startLine;

this._expanded = false;
this._readOnly = false;

this.updateCollapsedLineRow();
}

WebInspector.TextEditorMainChunk.prototype = {
addDecoration: function(decoration)
{
    this._textViewer.beginDomUpdates();
    if (typeof decoration === "string")
        this.element.addStyleClass(decoration);
    else {
        if (!this.element.decorationsElement) {
            this.element.decorationsElement = document.createElement("div");
            this.element.decorationsElement.className = "webkit-line-decorations";
            this.element.appendChild(this.element.decorationsElement);
        }
        this.element.decorationsElement.appendChild(decoration);
    }
    this._textViewer.endDomUpdates();
},

removeDecoration: function(decoration)
{
    this._textViewer.beginDomUpdates();
    if (typeof decoration === "string")
        this.element.removeStyleClass(decoration);
    else if (this.element.decorationsElement)
        this.element.decorationsElement.removeChild(decoration);
    this._textViewer.endDomUpdates();
},

removeAllDecorations: function()
{
    this._textViewer.beginDomUpdates();
    this.element.className = "webkit-line-content";
    if (this.element.decorationsElement) {
        this.element.removeChild(this.element.decorationsElement);
        delete this.element.decorationsElement;
    }
    this._textViewer.endDomUpdates();
},

get decorated()
{
    return this.element.className !== "webkit-line-content" || !!(this.element.decorationsElement && this.element.decorationsElement.firstChild);
},

get startLine()
{
    return this._startLine;
},

set startLine(startLine)
{
    this._startLine = startLine;
    this.element.lineNumber = startLine;
    if (this._expandedLineRows) {
        for (var i = 0; i < this._expandedLineRows.length; ++i)
            this._expandedLineRows[i].lineNumber = startLine + i;
    }
},

get expanded()
{
    return this._expanded;
},

set expanded(expanded)
{
    if (this._expanded === expanded)
        return;

    this._expanded = expanded;

    if (this.linesCount === 1) {
        if (expanded)
            this._textViewer._paintLine(this.element);
        return;
    }

    this._textViewer.beginDomUpdates();

    if (expanded) {
        this._expandedLineRows = [];
        var parentElement = this.element.parentElement;
        for (var i = this.startLine; i < this.startLine + this.linesCount; ++i) {
            var lineRow = this._createRow(i);
            this._textViewer._enableDOMNodeRemovedListener(lineRow, true);
            this._updateElementReadOnlyState(lineRow);
            parentElement.insertBefore(lineRow, this.element);
            this._expandedLineRows.push(lineRow);
        }
        this._textViewer._enableDOMNodeRemovedListener(this.element, false);
        parentElement.removeChild(this.element);
        this._textViewer._paintLines(this.startLine, this.startLine + this.linesCount);
    } else {
        var elementInserted = false;
        for (var i = 0; i < this._expandedLineRows.length; ++i) {
            var lineRow = this._expandedLineRows[i];
            this._textViewer._enableDOMNodeRemovedListener(lineRow, false);
            var parentElement = lineRow.parentElement;
            if (parentElement) {
                if (!elementInserted) {
                    elementInserted = true;
                    this._textViewer._enableDOMNodeRemovedListener(this.element, true);
                    parentElement.insertBefore(this.element, lineRow);
                }
                parentElement.removeChild(lineRow);
            }
            this._textViewer._releaseLinesHighlight(lineRow);
        }
        delete this._expandedLineRows;
    }

    this._textViewer.endDomUpdates();
},

set readOnly(readOnly)
{
    if (this._readOnly === readOnly)
        return;

    this._readOnly = readOnly;
        
    this._updateElementReadOnlyState(this.element);
    if (this._expandedLineRows) {
        for (var i = 0; i < this._expandedLineRows.length; ++i)
            this._updateElementReadOnlyState(this._expandedLineRows[i]);
    }
},

get readOnly()
{
    return this._readOnly;
},

_updateElementReadOnlyState: function(element)
{
    if (this._readOnly)
        element.addStyleClass("text-editor-read-only");
    else
        element.removeStyleClass("text-editor-read-only");
},

get height()
{
    if (!this._expandedLineRows)
        return this._textViewer._totalHeight(this.element);
    return this._textViewer._totalHeight(this._expandedLineRows[0], this._expandedLineRows[this._expandedLineRows.length - 1]);
},

get offsetTop()
{
    return (this._expandedLineRows && this._expandedLineRows.length) ? this._expandedLineRows[0].offsetTop : this.element.offsetTop;
},

_createRow: function(lineNumber)
{
    var lineRow = this._textViewer._cachedRows.pop() || document.createElement("div");
    lineRow.lineNumber = lineNumber;
    lineRow.className = "webkit-line-content";
    lineRow.textContent = this._textModel.line(lineNumber);
    if (!lineRow.textContent)
        lineRow.appendChild(document.createElement("br"));
    return lineRow;
},

getExpandedLineRow: function(lineNumber)
{
    if (!this._expanded || lineNumber < this.startLine || lineNumber >= this.startLine + this.linesCount)
        return null;
    if (!this._expandedLineRows)
        return this.element;
    return this._expandedLineRows[lineNumber - this.startLine];
},

updateCollapsedLineRow: function()
{
    if (this.linesCount === 1 && this._expanded)
        return;

    var lines = [];
    for (var i = this.startLine; i < this.startLine + this.linesCount; ++i)
        lines.push(this._textModel.line(i));

    this.element.removeChildren();
    this.element.textContent = lines.join("\n");

    // The last empty line will get swallowed otherwise.
    if (!lines[lines.length - 1])
        this.element.appendChild(document.createElement("br"));
}
}
