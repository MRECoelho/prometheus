var electron = require('electron');
var url = require('url');
var path = require('path');
var sqlite3 = require('sqlite3');


// Enable live reload for all the files inside your project directory
// require('electron-reload')(__dirname);

// var logic = require('./logic.js');
// var {runt} = require('./logic.js');
var app = electron.app, BrowserWindow = electron.BrowserWindow, Menu = electron.Menu, ipcMain = electron.ipcMain;
var mainWindow;
// Listen for the app to be ready
app.on('ready', function () {
    mainWindow = new BrowserWindow({});
    // load html file into window
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'mainWindow.html'),
        protocol: 'file',
        slashes: true
    }));
    
    mainWindow.setMenu(null);

    // runn;
    // runn();
    // const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    // Menu.setApplicationMenu(mainMenu);
});
// const mainMenuTemplate = [{}];
//catch node:name
ipcMain.on('node:name', function (e, item) {
    console.log("main.js: ", item);
    mainWindow.webContents.send('node:bounce', item);
    // logic.show(item);
});
ipcMain.on('dbinitrows', function (e, item) {
    console.log("main.js: ", item);
    mainWindow.webContents.send('node:bounce', item);
    // logic.show(item);
});
