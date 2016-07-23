angular.module('ServerRunner', [
  'Panel',
  'Window',
  'Common',
])

.run(function ($rootScope, PanelService, ServerService, GenericFileModel, Dialogs) {
  // Opens Servers panel
  PanelService.open({
    name: 'Created Servers',
    icon: 'mdi-server',
    template: 'views/servers.panel.html',
    open: true,
  })

  // Listens to create action
  $rootScope.$on('Servers:create', function (event, id) {
    Dialogs.prompt('Defina um identificador para o servidor', 'ID', '', (name) => {
      if(!name)
        return;

      // Filter name
      name = name.toLowerCase();

      // Creates server
      GenericFileModel.save('servers', name);
    });
  });

  // Listens to stop all servers action
  $rootScope.$on('Servers:stopAll', function (event, id) {
    let state = ServerService.state();
    for(let serverId in state)
      ServerService.stop(serverId);
  });

  // Listens to start all servers action
  $rootScope.$on('Servers:startAll', function (event, id) {
    let servers = GenericFileModel.list('servers');
    for(let k in servers)
      ServerService.start(servers[k]);
  });
})

// Manage Servers
.service('ServerService', function ($rootScope, ipcRenderer) {
  var service = this;

  // Subscribe to general servers update or a specific one
  service.subscribe = function (scope, serverId, callback){
    // Accepts only two parameters (second is callback)
    if(!callback){
      callback = serverId;
      serverId = null;
    }

    if(!scope || !callback)
      return console.error('Cannot subscribe with invalid scope and callback!');

    let eventName = 'ServerRunner:update' + (serverId ? ':' + serverId : '' );
    ipcRenderer.on(scope, eventName, callback);
  }

  // Subscribe to logs on a specific server
  service.subscribeLogs = function (scope, serverId, callback){
    if(!scope || !callback)
      return console.error('Cannot subscribe with invalid scope and callback!');

    let eventName = 'ServerRunner:log:' + serverId;
    ipcRenderer.on(scope, eventName, callback);
  }

  service.start = function (serverId) {
    ipcRenderer.send('ServerRunner:start', serverId);
  }

  service.stop = function (serverId) {
    ipcRenderer.send('ServerRunner:stop', serverId);
  }

  service.state = function (serverId) {
    return ipcRenderer.sendSync('ServerRunner:state', serverId);
  }
})


.controller('ServersPanelCtrl', function ($scope, $rootScope,
  ServerService, WindowService, GenericFileModel){

  // `servers` holds the list of all servers
  $scope.servers = {};
  $scope.serversPorts = {};

  // `serversState` holds the list of running servers
  $scope.serversState = {};

  // Opens a new window for the Server
  $scope.openServerWindow = function (serverId) {
    WindowService.open({
      id: 'Server:'+serverId,
      name: `Server [${serverId}]`,
      template: 'views/servers.window.html',
      userData: {
        serverId: serverId,
      }
    });
  }

  // Update list of servers and it's states on update
  update();
  GenericFileModel.subscribe($scope, 'servers', update);
  ServerService.subscribe($scope, update);

  function update(){
    $scope.servers = GenericFileModel.list('servers');
    $scope.serversState = ServerService.state();

    // Update servers ports
    $scope.serversPorts = {};
    for(var k in $scope.servers){
      let id = $scope.servers[k];
      let server = GenericFileModel.get('servers', id);
      $scope.serversPorts[id] = server.env ? server.env.PORT : '[No Port]';
    }

    // Apply changes to scope if not in digest phase
    if(!$scope.$$phase)
      $scope.$apply();
  }
})


//
// Configures a server and enables to start/stop
//
.controller('ServerWindowCtrl', function ($scope, GenericFileModel,
  ServerService, Dialogs, WindowService) {
  const MAX_LOG_COUNT = 2000;

  var win = null;

  $scope.serverUp = false;
  $scope.serverUpColor = 'red';

  $scope.statusState = null;
  $scope.statusString = null;

  $scope.configs = {};
  $scope.serverId = null;

  $scope.needsSave = false;

  // Keep logs here
  $scope.logs = [];
  let logsBuffer = [];

  // Called from view to set this window data
  $scope.init = function (_win){
    win = _win;
    $scope.serverId = win.userData.serverId;

    // Load data
    $scope.load();
  }

  // Loads and overrides all configs into local state vars
  $scope.load = function load(){
    updateInstanceState();
    updateServerConfig();

    // Keep track of the state of this instance
    ServerService.subscribe($scope, $scope.serverId, updateInstanceState);
    ServerService.subscribeLogs($scope, $scope.serverId, updateLogs);
  }

  // Saves data into a persistent storage
  $scope.save = function save(){
    GenericFileModel.save('servers', $scope.serverId, $scope.configs);
    $scope.needsSave = false;
  }

  // Removes this server
  $scope.deleteServer = function deleteServer(confirm) {
    if(confirm)
      return Dialogs.confirm('Tem certeza de que deseja deletar este servidor?',
        'Sim', 'Cancelar', (confirm) => {
          confirm && $scope.deleteServer();
      });

    // Make sure server is stopped
    ServerService.stop($scope.serverId);

    // Remove data
    GenericFileModel.remove('servers', $scope.serverId);
    WindowService.close(win);
  }

  // Opens up a image file and sets to the logo
  $scope.openImage = function openImage() {
    const {dialog} = require('electron').remote;

    let imagePath = dialog.showOpenDialog({
      title: 'Select an server`s Logo',
      defaultPath: $scope.configs.env.APP_LOGO || undefined,
      properties: ['openFile'],
      filters: [
        {name: 'Images', extensions: ['jpg', 'png', 'gif']},
        {name: 'All Files', extensions: ['*']}
      ],
    });

    // Select imagePath
    imagePath = imagePath ? imagePath[0] || null : null;

    // If imagePath is set, update the config
    if(!imagePath)
      return;

    $scope.configs.env.APP_LOGO = imagePath;
  }

  // Open up a path and sets to the DB_FOLDER
  $scope.openDBPath = function openDBPath() {
    const {dialog} = require('electron').remote;

    let imagePath = dialog.showOpenDialog({
      title: 'Select a place to store the DB',
      defaultPath: $scope.configs.env.DB_FOLDER || undefined,
      properties: ['openDirectory'],
    });

    // Select imagePath
    imagePath = imagePath ? imagePath[0] || null : null;

    // If imagePath is set, update the config
    if(!imagePath)
      return;

    $scope.configs.env.DB_FOLDER = imagePath;
  }

  // Change the server state (start/stop)
  $scope.changeServerState = function (){
    // console.log($scope.serverUp);
    if($scope.serverUp){
      // Clear logs prior to starting
      $scope.logs = [];
      logsBuffer = [];

      ServerService.start($scope.serverId);
    }else{
      ServerService.stop($scope.serverId);
    }
  }

  // Listen for changes in the config, and set flag of invalidation
  $scope.$watch('configs', function(obj, old) {
    if(obj !== old)
      $scope.needsSave = true;
  }, true);

  function updateInstanceState(){
    let serverUp = $scope.statusState = ServerService.state($scope.serverId);
    $scope.serverUp = serverUp;

    if(serverUp){
      $scope.statusString = 'Running';
      $scope.serverUpColor = 'green';
    }else{
      $scope.statusString = 'Stopped';
      $scope.serverUpColor = 'red';
    }

    // Apply changes to scope if not in digest phase
    if(!$scope.$$phase)
      $scope.$apply();
  }

  function updateServerConfig(){
    const {app} = require('electron').remote;
    let configs = GenericFileModel.get('servers', $scope.serverId);

    // Set as not saved if has no data yet
    if(!configs.env)
      $scope.needsSave = true;

    // Set defaults on load
    $scope.configs = _.defaults(configs || {}, {
      minUptime: 2000,
      spinSleepTime: 2000,
    })

    // Apply defaults on `env`
    $scope.configs.env = _.defaults(configs.env || {}, {
      APP_NAME: $scope.serverId,
      APP_LOGO: '',
      PASSWORD: '',
      DB_FOLDER: app.getPath('userData'),
      PORT: 3000,
    })
  }

  // Update logs (pushes to log array and limits it's content)
  let counter = 1;

  var refreshLogs = _.throttle(()=>{
    $scope.logs.push(...logsBuffer);
    logsBuffer = [];

    // Limit logs
    if($scope.logs.length > MAX_LOG_COUNT)
      $scope.logs.splice(0, $scope.logs.length - MAX_LOG_COUNT);

    // Apply changes to scope if not in digest phase
    if(!$scope.$$phase)
      $scope.$apply();
  }, 100)

  function updateLogs(evt, type, message){
    logsBuffer.push([counter++, type, message]);

    refreshLogs();
  }

})
