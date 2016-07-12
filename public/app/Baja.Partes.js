angular.module('Baja', [
  'BajaSync',
])

// Mostra peças no painel
.service('PartesPanel', function () {
  this.name = 'Peças Importadas'
  this.icon = 'mdi-cube-outline'
  this.template = 'views/baja.partes.panel.html'
})

.run(function ($rootScope, WindowService, PanelService, PartesPanel){
  // Abre painel
  PanelService.open(PartesPanel)

  // Listen to open event and adds a new window to it
  var count = 1;
  $rootScope.$on('PartesWindow:open', function (event, id) {
    // Window counter sums...
    count++;

    // Create window object and opens it
    WindowService.open({
      id: 'PartesWindow',
      name: 'Parte',
      template: 'views/baja.partes.window.html?' + count,
      userData: {
        id: id || null,
        name: id || '*novo*',
      }
    });
  })
})

.controller('PartesPanelCtrl', function ($scope, $rootScope, GenericFileModel,
  ipcRenderer, WindowService){

  $scope.objectList = null;

  $scope.open3DFile = function (id){
    // Set current window and send command to open this file
    $rootScope.$broadcast('PartesWindow:open', id);
  }

  // Update list on update
  GenericFileModel.subscribe($scope, 'object3d', updateObjects);

  // Initialize Objects by reading DB
  updateObjects();

  function updateObjects (){
    $scope.objectList = GenericFileModel.list('object3d');

    // Apply changes to scope if not in digest phase
    if(!$scope.$$phase)
      $scope.$apply();
  }
})


.controller('PartesWindowCtrl', function ($scope, $timeout, $element,
  Basic3DSetup, GenericFileModel, DragNDrop, THREELoader, Dialogs,
  WindowService) {

  // Scope state variables
  $scope.fileId = null;
  $scope.saved = true;

  // Save this Window Context
  var $win = null;
  $scope.init = function (win){
    $win = win;

    if($win.userData.id)
      $scope.importPart($win.userData.id);

    $scope.fileId = $win.userData.id;
  }

  // Setup Drag and Drop
  $scope.dropping = false;
  var element = $element[0];
  var file = null;
  DragNDrop.onDrop(element, function loadModel(event) {
    file = event.files[0];

    // Parse the file and add to the scene
    $scope.importFromFile(file);

  }, (state) => {
    // Update Scope state for drag and drop
    $scope.dropping = state;
    $scope.$apply();
  })

  // Find element where to render
  var canvas = $($element).find('.three-view')[0];

  // Create a basic Scene from template
  var setup = new Basic3DSetup($scope, canvas, {grid: true, axis: true});
  setup.camera.position.z = 1;

  // Setup contorl camera
  controls = new THREE.OrbitControls(setup.camera, setup.renderer.domElement);
  controls.addEventListener('change', setup.render.bind(setup));
  controls.enableDamping = false;
  controls.dampingFactor = 0.15;
  controls.enableZoom = true;
  controls.zoomSpeed = 1.5;
  controls.enableRotate = true;
  controls.rotateSpeed = 0.3;


  // This is where all objects in the scene loaded will be
  var partsGroup = new THREE.Group();
  setup.scene.add(partsGroup);

  // Add parts group to ray trace
  // console.log(partsGroup)
  setup.addRaytraceObject(partsGroup.children);


  // Startup
  $timeout(function (){
    // Start by creating new document
    // $scope.newPart();

    // Post-start rendering to let canvas be measured
    setup.updateSize();

    // Start rendering
    render();
  });

  function render(){
    // requestAnimationFrame(render);
    setup.render();
  }

  // Adds the mesh to the scene
  $scope.addToScene = function (mesh) {
    partsGroup.add(mesh);
    render();
  }

  // Save to file
  $scope.savePart = function (){
    if(!$scope.fileId){
      Dialogs.prompt('Qual o nome da peça?', 'Nome', '', (name) => {
        name && ($scope.fileId = name) && $scope.savePart();
      });
      return;
    }

    // Persist data to file
    GenericFileModel.save('object3d', $scope.fileId, partsGroup.toJSON());
    // Update this id
    $win.userData.id = $scope.fileId;
    $win.userData.name = $scope.fileId;
    $scope.saved = true;
  }

  // Deletes this part
  $scope.deletePart = function (confirm){
    if(!confirm){
      Dialogs.confirm('Tem certeza de que deseja deletar esta peça?',
        'Sim', 'Cancelar', (confirm) => {
        confirm && $scope.deletePart(true);
      });
      return;
    }

    // Remove from FileDB
    if($scope.fileId)
      GenericFileModel.remove('object3d', $scope.fileId);

    // Close this window
    WindowService.close($win);
  }


  // Open a Mesh file by id and adds to the scene
  $scope.importPart = function (id, didntChange) {
    // If no id set, set default one
    $scope.fileId = $scope.fileId || id;

    // Load in canvas
    var meshPath = GenericFileModel.getPath('object3d', id);

    // Check id exitsts
    if(!meshPath)
      return Dialogs.alert(`Peça '${id}' não encontradas`);

    loader = new THREE.ObjectLoader();
    loader.load(meshPath, function (mesh) {
      $scope.addToScene(mesh);
      didntChange ? ($scope.saved = true) : ($scope.saved = false);
    });
  }

  // Import to the scene from a file (does parsing)
  $scope.importFromFile = function (file) {
    THREELoader.loadFile(file, function (err, scene) {
      if(err)
        return Dialogs.alert('Falha ao processar.\n' + err);

      // Make a group
      var group = new THREE.Group();

      // Import all meshes into a single group
      while (scene.children.length > 0) {
        // Get the nested mesh child
        var child = scene.children.pop().children[0];

        // Update materials
        child.material.side = 2;

        // Add this mesh to the group
        group.add(child);
      }

      $scope.addToScene(group);
      $scope.saved = false;
    })
  }
})
