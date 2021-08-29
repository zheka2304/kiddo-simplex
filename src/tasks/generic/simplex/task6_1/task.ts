
class EvilTrash extends SimpleGameObject {
  constructor(position: Coords) {
    super(position, {
      texture: {
        atlas: {src: 'assets:/object-atlas-trash-can.png', width: 8, height: 1},
        items: {
          [DefaultTileStates.MAIN]: [[0, 7, 0, 0]],
        },
        fps: 6
      },
      immutableTags: [DefaultTags.DEADLY, 'trash']
    });
  }

  onTick(writer: GenericWriterService): void {
    super.onTick(writer);
    this.position.y++;
  }
}

class GameWatcher extends GameObjectBase {
  public ticks = 0;

  onTick(writer: GenericWriterService): void {
    super.onTick(writer);
    if (this.ticks % 3 === 1) {
      for (let i = 0; i < 16; i++) {
        if (Math.random() < 0.45) {
          writer.addGameObject(new EvilTrash({x: 2 * i + 1, y: -1}));
        }
      }
    }
    this.ticks++;
  }
}


// --------- registration -------------

  TileRegistry.addBasicTile('grass', {
    texture: {
      atlas: {src: 'assets:/connected-tile-atlas.png', width: 24, height: 16},
      items: {
        [DefaultTileStates.MAIN]: { ctType: ConnectedTextureFormatType.FULL_ONLY2, offset: [[0, 12]] }
      }
    }
  });

  TileRegistry.addBasicTile('goal-flag', {
    texture: {
      atlas: {src: 'assets:/tile-atlas.png', width: 4, height: 4},
      items: {
        [DefaultTileStates.MAIN]: [[2, 0]]
      }
    },
    immutableTags: [DefaultTags.GOAL]
  });


  // --------- tile generation -------------
  Builder.setupGameField({width: 31, height: 10}, {
    lightMap: {
      enabled: false,
      ambient: 0.09
    },
    tilesPerScreen: 8,
    pixelPerfect: 32
  });

  for (let x = 0; x < 31; x++) {
    for (let y = 0; y < 10; y++) {
      Builder.setTile(x, y, 'grass');
    }
  }

  Builder.setTile(30, 8, ['grass', 'goal-flag']);

  // ---------  player  -------------
  const player = new GenericPlayer({x: 0, y: 8}, {
      skin: 'alexey',
      defaultLightSources: [
        {radius: 1, brightness: 1},
      ],

      minVisibleLightLevel: 0.1,
      interactRange: 1,
      lookRange: 6
    }
  );
  Builder.setPlayer(player);


  // --------- object -------------

  Builder.addGameObject(new GameWatcher({x: 0, y: 0}));

  // ---------- logic ---------------

  Builder.addCheckingLogic(DefaultCheckingLogic.GOAL_REACHED);