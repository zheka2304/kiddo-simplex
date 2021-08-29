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

  // --------- tile generation -------------
  Builder.setupGameField({width: 9, height: 9}, {
    lightMap: {
      enabled: false
    },
    pixelPerfect: 32,
    tilesPerScreen: 6
  });

  for (let x = 0; x < 9; x++) {
    for (let y = 0; y < 9; y++) {
      Builder.setTile(x, y, 'wood-tile');
      if (y === 0 || y === 8) {
        Builder.setTile(x, y, 'wall');
      }
      if (x === 0 || x === 8) {
        Builder.setTile(x, y, 'wall');
      }
    }
  }


  // --------- object -------------
  const positionX = Math.floor(Math.random() * 5) + 2;
  const positionY = Math.floor(Math.random() * 5) + 2;

  const letter = new SimpleGameObject({x: positionX, y: positionY}, {
    texture: {
      atlas: {src: 'assets:/connected-tile-atlas.png', width: 24, height: 16},
      items: {
        [DefaultTileStates.MAIN]: [[11, 9]],
      }
    },
    mutableTags: [DefaultTags.ITEM, 'letter']
  });
  Builder.addGameObject(letter);


  // ---------  player  -------------
  Builder.setPlayer(new GenericPlayer({x: 4, y: 4}, {
      skin: 'parrot',
      defaultLightSources: [
        {radius: 1, brightness: 1},
      ],

      minVisibleLightLevel: 0.1,
      interactRange: 1,
    }
  ));

  // ---------- logic ---------------
  Builder.addCheckingLogic((reader: GenericReaderService) => {
    if (reader.getPlayer().findItemsInInventory(['letter']).length === 0) {
      return 'NO_REQUIRED_ITEM_IN_INVENTORY';
    }
    return null;
  });