// --------- registration -------------

  TileRegistry.addBasicTile('wood-tile', {
    texture: {
      atlas: {src: 'assets:/connected-tile-atlas.png', width: 24, height: 16},
      items: {
        [DefaultTileStates.MAIN]: { ctType: ConnectedTextureFormatType.FULL_ONLY2, offset: [[0, 6]]}
      }
    },
    immutableTags: []
  });

  TileRegistry.addBasicTile('wall', {
    texture: {
      atlas: {src: 'assets:/connected-tile-atlas.png', width: 24, height: 16},
      items: {
        [DefaultTileStates.MAIN]: { ctType: ConnectedTextureFormatType.DEFAULT, offset: [[0, 8]]}
      }
    },
    ctCheckConnected: DefaultCTLogic.ANY_TAGS(['-wall-connect']),
    immutableTags: [DefaultTags.OBSTACLE, '-wall-connect']
  });

  TileRegistry.addBasicTile('table', {
    texture: {
      atlas: {src: 'assets:/connected-tile-atlas.png', width: 24, height: 16},
      items: {
        [DefaultTileStates.MAIN]: [[7, 9]],
      }
    },
    immutableTags: [DefaultTags.OBSTACLE]
  });

  TileRegistry.addBasicTile('keyboard', {
    texture: {
      atlas: {src: 'assets:/connected-tile-atlas.png', width: 24, height: 16},
      items: {
        [DefaultTileStates.MAIN]: [[9, 8]],
      }
    },
    immutableTags: [DefaultTags.OBSTACLE]
  });

  TileRegistry.addBasicTile('papers', {
    texture: {
      atlas: {src: 'assets:/connected-tile-atlas.png', width: 24, height: 16},
      items: {
        [DefaultTileStates.MAIN]: [[9, 9]],
      }
    },
    immutableTags: [DefaultTags.OBSTACLE]
  });

  // --------- tile generation -------------
  Builder.setupGameField({width: 7, height: 7}, {
    lightMap: {
      enabled: true,
      ambient: 0.8
    },
    pixelPerfect: 32,
    tilesPerScreen: 6
  });

  for (let x = 0; x < 7; x++) {
    for (let y = 0; y < 7; y++) {
      Builder.setTile(x, y, 'wood-tile');
      if (y === 0 || y === 6) {
        Builder.setTile(x, y, 'wall');
      }
      if (x === 0 || x === 6) {
        Builder.setTile(x, y, 'wall');
      }
    }
  }

  Builder.setTile(2, 1, ['wood-tile', 'table: {"offset": [-1, 0]}', 'papers']);
  Builder.setTile(3, 1, ['wood-tile', 'table: {"offset": [0, 0]}', 'keyboard']);
  Builder.setTile(4, 1, ['wood-tile', 'table: {"offset": [1, 0]}']);


  // ---------  player  -------------
  Builder.setPlayer(new GenericPlayer({x: 3, y: 3}, {
      skin: 'parrot',

      minVisibleLightLevel: 0.1,
      interactRange: 1,
      initialRotation: Direction.UP
    }
  ));


  // --------- object -------------
  const monitor = new SimpleGameObject({x: 3, y: 1}, {
    texture: {
      atlas: {src: 'assets:/connected-tile-atlas.png', width: 24, height: 16},
      items: {
        [DefaultTileStates.MAIN]: [[8, 8]],
      }
    },
    immutableTags: [DefaultTags.OBSTACLE]
  });
  Builder.addGameObject(monitor);

  // ------------ logic --------------

  const arrayString = [
    '??????????_??????_??????????????_??????',
    '????_????????????????????_??????_??????????_??????????????????????????????_????????',
    '??????????_??????_C??????????_??????????_????????????_??????',
    '????????_??????'
  ];
  const arrayStringAnswers = arrayString.map(c => {
    // @ts-ignore
    c = c.replaceAll('??????', '.');
    // @ts-ignore
    c = c.replaceAll('??????', ',');
    // @ts-ignore
    c = c.replaceAll('??????????????????????????????_????????', '!');
    // @ts-ignore
    c = c.replaceAll('_', ' ');
    return c;
  });

  let levelPassed = false;
  Builder.addGameObject(new ConsoleTerminalGameObject({x: 3, y: 1}, {
    enableEcho: true,

    requireInput: (model) => arrayString.shift(),

    consumeOutput: (model, value: any) => {
      return arrayStringAnswers.shift() === value;
    },

    onApplied: (model, allValid) => {
      if (allValid && arrayStringAnswers.length === 0) {
        levelPassed = true;
      }
    },
  }));

  Builder.addCheckingLogic(() => levelPassed ? null : 'INVALID_OUTPUT');