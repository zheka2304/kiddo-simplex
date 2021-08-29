
class EvilRobot extends CharacterBase {
  public path: { x: number, y: number, dir: string }[] = null;
  public fiftyPath = 0;
  public counter = 0;
  public idleTicks = 0;
  constructor(
    position: Coords
  ) {
    super(position,  Direction.UP, 'robot');
    this.addImmutableTag('robot');
    this.addImmutableTag('deadly');
  }

  onPostTick(writer: GenericWriterService): void {
    super.onPostTick(writer);

    if (this.idleTicks > 0) {
      this.idleTicks--;
      return;
    }

    if (
      !this.path || this.counter === this.fiftyPath ||
      writer.getReader().getTileTagsAt(this.position.x, this.position.y).has('-passage-robot-flag')
    ) {
      const { path, reached } = BFS(this.position, SceneContextProvider.getReader().getPlayer().position);
      this.path = path;
      if (this.path) {
        if (!reached) {
          const reader = writer.getReader();
          let endIndex = this.path.length - 1;
          for (; endIndex >= 0; endIndex--) {
            const pos = this.path[endIndex];
            if (!reader.getTileTagsAt(pos.x, pos.y).has('-passage-robot-flag')) {
              endIndex++;
              break;
            }
          }
          this.path = this.path.slice(0, endIndex + 1);
        }
        this.path.shift();
        this.fiftyPath = Math.floor(this.path.length / 2);
        this.counter = 0;
      }
    }
    if (this.path) {
      const pos = this.path.shift();
      if (pos) {
        const tags = writer.getReader().getAllTagsAt(pos.x, pos.y);
        if (tags.has('robot')) {
          this.path.unshift(pos);
        } else if (tags.has(DefaultTags.OBSTACLE)) {
          if (tags.has(DefaultTags.OBSTACLE)) {
            this.path = null;
            this.idleTicks = 5;
          }
        } else {
          this.position.x = pos.x;
          this.position.y = pos.y;
          this.direction = pos.dir.toUpperCase() as Direction;
          this.counter++;
        }
      }
    }
  }
}

class EnergyAccess extends SimpleGameObject {
  constructor(
    position: Coords
  ) {
    super(position, {
      texture: {
        atlas: {src: 'assets:/connected-tile-atlas.png', width: 24, height: 16},
        items: {
          main: [[17, 3]],
          broken: [[18, 3]],
        }
      },
      initialState: 'main',
      mutableTags: [DefaultTags.OBSTACLE],
      stationary: true,
    });
  }

  onInteract(writer: GenericWriterService, interactingObject: GenericGameObject): boolean {
    if (this.state === 'broken') return false;
    this.state = 'broken';
    const arrayRobots = [];

    const playerPos = writer.getReader().getPlayer().position;
    for (let i = 0; i < 2; i++) {
      let regenerate = true;
      while (regenerate) {
        const randomPositionX = Math.floor(Math.random() * 10 + 20) * (Math.random() > .5 ? 1 : -1) + playerPos.x;
        const randomPositionY = Math.floor(Math.random() * 10 + 20) * (Math.random() > .5 ? 1 : -1) + playerPos.y;
        const tags = writer.getReader().getAllTagsAt(randomPositionX, randomPositionY);
        if (tags.has('-station-floor') && !tags.has('-passage-robot-flag')) {
          arrayRobots.push(
            new EvilRobot({x: randomPositionX, y: randomPositionY})
          );
          regenerate = false;
        }
      }
    }

    for (const robot of arrayRobots) {
      writer.addGameObject(robot);
    }
    return true;
  }

}


class StationaryConsole extends ConsoleTerminalGameObject {
  isStationary(): boolean {
    return true;
  }
}

const roomIdByCoords = (x, y) => {
  const ox = Math.floor(x / 10);
  const oy = Math.floor(y / 10);
  return `${ox}:${oy}`;
};

const roomCenterById = (roomId: string) => {
  const coords = roomId.split(':').map(n => parseInt(n, 10));
  return coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1]) ? {x: coords[0] * 10 + 5, y: coords[1] * 10 + 5} : null;
};

// ------------ BFS ----------------
const BFS = (start: Coords, target: Coords) => {
  const reader = SceneContextProvider.getReader();
  // reader.getPlayer().addAction(target, CharacterActionType.ITEM);

  const queue = [];
  const visited = {};
  queue.push(start);
  visited[`${start.x}: ${start.y}`] = [start];
  while (queue.length > 0) {
    const node = queue.shift();
    const tags = reader.getAllTagsAt(node.x, node.y);
    if (tags.has('-station-floor') && !tags.has(DefaultTags.OBSTACLE)) {
      if (node.x === target.x && node.y === target.y) {
        break;
      }
      // reader.getPlayer().addAction(node, CharacterActionType.READ);
      const neighbors = [
        {x: node.x, y: node.y - 1, dir: 'up'},
        {x: node.x, y: node.y + 1, dir: 'down'},
        {x: node.x + 1, y: node.y, dir: 'right'},
        {x: node.x - 1, y: node.y, dir: 'left'},
      ];
      const path = visited[`${node.x}: ${node.y}`];
      for (const neighbor of neighbors) {
        if (visited[`${neighbor.x}: ${neighbor.y}`] === undefined) {
          queue.push(neighbor);
          visited[`${neighbor.x}: ${neighbor.y}`] = [...path, neighbor];
        }
      }
    }
  }

  const targetPath = visited[`${target.x}: ${target.y}`];
  if (targetPath) {
    return { path: targetPath, reached: true };
  } else {
    const pathLen = path => {
      const { x, y } = path[path.length - 1];
      const dx = x - target.x;
      const dy = y - target.y;
      return Math.sqrt(dx * dx + dy * dy) * 4 + path.length;
    };

    let shortestLen = Infinity;
    return {
      path: Object.values(visited).reduce((shortest, current) => {
        const len = pathLen(current);
        if (len < shortestLen) {
          shortestLen = len;
          return current;
        } else {
          return shortest;
        }
      }, null),
      reached: false
    };
  }
};

const pathToCommands = (targetPath) => {
  const directions = targetPath.slice(1).map(c => c.dir);
  let lastStep = SceneContextProvider.getReader().getPlayer().direction.toLowerCase();
  const newTurn = [];
  let counterStep = 1;
  for (const dir of directions) {
    if (lastStep === dir) {
      counterStep += 1;
      lastStep = dir;
      continue;
    }
    if (counterStep > 0) {
      newTurn.push('вперед');
      newTurn.push(counterStep);
      counterStep = 1;
    }
    if (lastStep === 'left' && dir === 'down') {
      newTurn.push('влево');
    } else if (lastStep === 'left' && dir === 'up') {
      newTurn.push('вправо');
    } else if (lastStep === 'right' && dir === 'down') {
      newTurn.push('вправо');
    } else if (lastStep === 'right' && dir === 'up') {
      newTurn.push('влево');
    } else if (lastStep === 'down' && dir === 'right') {
      newTurn.push('влево');
    } else if (lastStep === 'down' && dir === 'left') {
      newTurn.push('вправо');
    } else if (lastStep === 'up' && dir === 'right') {
      newTurn.push('вправо');
    } else if (lastStep === 'up' && dir === 'left') {
      newTurn.push('влево');
    } else if (lastStep === 'up' && dir === 'down') {
      newTurn.push('вправо');
      newTurn.push('вправо');
    }
    lastStep = dir;
  }
  if (counterStep > 0) {
    newTurn.push('вперед');
    newTurn.push(counterStep);
    counterStep = 1;
  }
  return newTurn;
};


CharacterSkinRegistry.addCharacterSkin('robot', {
    idleTexture: {
      atlas: {src: 'assets:/character-atlas-robot.png', width: 6, height: 6},
      items: {
        [Direction.DOWN]: [[0, 2]],
        [Direction.UP]: [[0, 4]],
        [Direction.LEFT]: [[0, 3]],
        [Direction.RIGHT]: [[0, 5]],
        dead: [[0, 1]],
      }
    },
    walkingTexture: {
      atlas: {src: 'assets:/character-atlas-robot.png', width: 6, height: 6},
      items: {
        [Direction.DOWN]: [[0, 5, 2, 2]],
        [Direction.UP]: [[0, 5, 4, 4]],
        [Direction.LEFT]: [[0, 5, 3, 3]],
        [Direction.RIGHT]: [[0, 5, 5, 5]],
        dead: [[0, 1]],
      },
      fps: 12
    }
  });

  // --------- registration -------------

  TileRegistry.addBasicTile('station-floor', {
    texture: {
      atlas: {src: 'assets:/connected-tile-atlas.png', width: 24, height: 16},
      items: {
        [DefaultTileStates.MAIN]: {ctType: ConnectedTextureFormatType.FULL_ONLY, offset: [[6, 4]]}
      }
    },
    ctCheckConnected: DefaultCTLogic.ANY_TAGS(['-station-floor']),
    immutableTags: ['-station-floor']
  });


  TileRegistry.addBasicTile('passage-robot-flag', {
    /* texture: {
      atlas: {src: 'assets:/character-action-atlas.png', width: 4, height: 4},
      items: {
        [DefaultTileStates.MAIN]: [[0, 0]]
      }
    }, */
    immutableTags: ['-passage-robot-flag']
  });

  TileRegistry.addBasicTile('station-wall', {
    texture: {
      atlas: {src: 'assets:/connected-tile-atlas.png', width: 24, height: 16},
      items: {
        [DefaultTileStates.MAIN]: {ctType: ConnectedTextureFormatType.DEFAULT, offset: [[6, 2]]}
      }
    },
    ctCheckConnected: DefaultCTLogic.ANY_TAGS(['-station-wall']),
    immutableTags: [DefaultTags.OBSTACLE, '-station-wall']
  });

  TileRegistry.addBasicTile('station-door', {
    texture: {
      atlas: {src: 'assets:/connected-tile-atlas.png', width: 24, height: 16},
      items: {
        [DefaultTileStates.MAIN]: [[19, 2]]
      }
    }
  });

  TileRegistry.addBasicTile('station-wall-front', {
    texture: {
      atlas: {src: 'assets:/connected-tile-atlas.png', width: 24, height: 16},
      items: {
        [DefaultTileStates.MAIN]: {ctType: ConnectedTextureFormatType.DEFAULT, offset: [[14, 2]]}
      }
    },
    ctCheckConnected: DefaultCTLogic.ANY_TAGS(['-station-wall-front']),
    immutableTags: [DefaultTags.OBSTACLE, '-station-wall-front']
  });

  TileRegistry.addBasicTile('moon-stone', {
    texture: {
      atlas: {src: 'assets:/connected-tile-atlas.png', width: 24, height: 16},
      items: {
        [DefaultTileStates.MAIN]: {ctType: ConnectedTextureFormatType.FULL_ONLY, offset: [[6, 0]]}
      }
    }
  });

  TileRegistry.addBasicTile('moon-stone-decoration', {
    texture: {
      atlas: {src: 'assets:/connected-tile-atlas.png', width: 24, height: 16},
      items: {
        [DefaultTileStates.MAIN]: {ctType: ConnectedTextureFormatType.FULL_ONLY, offset: [[8, 0]]}
      }
    }
  });

  TileRegistry.addBasicTile('wood-tile', {
    texture: {
      atlas: {src: 'assets:/tile-atlas.png', width: 4, height: 4},
      items: {
        [DefaultTileStates.MAIN]: [[1, 0]]
      }
    },
    immutableTags: []
  });


// ---------  player  -------------
  const player = new GenericPlayer({x: 3, y: 3}, {
      skin: 'kadabra',
      defaultLightSources: [
        {radius: 3, brightness: 1},
      ],

      initialRotation: Direction.RIGHT,
      minVisibleLightLevel: 0.1,
      interactRange: 1,
      lookRange: 35
    }
  );
  Builder.setPlayer(player);

  // --------- tile generation -------------
  Builder.setupGameField({width: 71, height: 71}, {
    lightMap: {
      enabled: false,
      ambient: 0.09
    },
    tilesPerScreen: 50,
    pixelPerfect: 32
  });

  const consoleObject = (ox, oy) => {
    Builder.addGameObject(new SimpleGameObject({x: 3 + ox, y: 1 + oy}, {
      texture: {
        atlas: {src: 'assets:/connected-tile-atlas.png', width: 24, height: 16},
        items: {
          [DefaultTileStates.MAIN]: [[16, 3]],
        }
      },
      immutableTags: [DefaultTags.ITEM, 'console'],
      item: {ignoreObstacle: true},
      stationary: true,
    }));

    const generateString = () => {
      const alphabet = Math.random() < 0.7 ? 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя' : '1234567890';
      const randomSize = Math.floor(Math.random() * 6) + 4;
      let randomWord = '';
      for (let i = 0; i < randomSize; i++) {
        const randomIndex = Math.floor(Math.random() * alphabet.length);
        randomWord += alphabet[randomIndex];
      }
      return (randomWord);
    };

    let consoleInputs = [];
    const randomIndex = Math.floor(Math.random() * 5);
    for (let i = 0; i < 6; i++) {
      consoleInputs.push(generateString());
    }
    consoleInputs[randomIndex] = 'пароль';

    const password = consoleInputs[randomIndex + 1];
    let passwordCorrect = false;

    Builder.addGameObject(new StationaryConsole({x: 3 + ox, y: 1 + oy}, {
      enableEcho: true,
      disablePreview: true,

      requireInput: (model) => consoleInputs.shift(),

      consumeOutput: (model, value: any) => {
        if (!passwordCorrect) {
          if (value === password) {
            setTimeout(() => model.lines = ['!{green}ПРАВИЛЬНЫЙ ПАРОЛЬ!', 'ВВЕДИТЕ КОМАНДУ:'], 0);
            passwordCorrect = true;
          } else {
            setTimeout(() => model.lines.push('!{red}НЕПРАВИЛЬНЫЙ ПАРОЛЬ!'), 0);
            passwordCorrect = false;
          }
        } else {
          const command = (value as string).split(' ');
          if (command[0] === 'путь') {
            const target = command[1];
            // noinspection NonAsciiCharacters
            const indexByTarget = {
              энергия1: 0,
              энергия2: 1,
              энергия3: 2,
              энергия4: 3,
            };
            const targetPosition = arrayEnergyPositions[indexByTarget[target]];
            if (targetPosition) {
              const { path, reached } = BFS(SceneContextProvider.getReader().getPlayer().position, targetPosition);
              if (path && reached) {
                consoleInputs = pathToCommands(path);
                setTimeout(() => model.lines.push(`!{green}ПУТЬ ПОСТРОЕН, ДЛИНА ${path.length}`), 0);
              } else {
                consoleInputs = [];
                setTimeout(() => model.lines.push('!{yellow}ПУТЬ НЕ НАЙДЕН'), 0);
              }
              return true;
            } else {
              setTimeout(() => model.lines.push('!{red}НЕПРАВИЛЬНАЯ ЦЕЛЬ: ' + target), 0);
              consoleInputs = [];
              return false;
            }
          } else if (command[0] === 'двери') {
            const roomId = command[1];
            const action = command[2];
            const roomPos = roomCenterById(roomId);
            if (!roomPos) {
              setTimeout(() => model.lines.push('!{red}НЕКОРРЕКТНАЯ КОМНАТА: ' + roomId), 0);
              consoleInputs = [];
              return false;
            }
            if (action !== 'открыть' && action !== 'закрыть') {
              setTimeout(() => model.lines.push('!{red}НЕКОРРЕКТНОЕ ДЕЙСТВИЕ: ' + action), 0);
              consoleInputs = [];
              return false;
            }

            const doorPositions = [
              {x: roomPos.x, y: roomPos.y - 3, count: true},
              {x: roomPos.x, y: roomPos.y + 4, count: true},
              {x: roomPos.x - 4, y: roomPos.y, count: true},
              {x: roomPos.x + 4, y: roomPos.y, count: true},
              {x: roomPos.x + 4, y: roomPos.y - 1, count: false},
              {x: roomPos.x - 4, y: roomPos.y - 1, count: false},
            ];
            const reader = SceneContextProvider.getReader();
            let doorCounter = 0;
            for (const doorPosition of doorPositions) {
              for (const gameObject of reader.getGameObjectsAt(doorPosition.x, doorPosition.y)) {
                if (gameObject.getTags().has('door')) {
                  if (action === 'открыть') {
                    (gameObject as SimpleGameObject).state = 'open';
                    gameObject.removeTag(DefaultTags.OBSTACLE);
                  } else {
                    (gameObject as SimpleGameObject).state = 'close';
                    gameObject.addTag(DefaultTags.OBSTACLE);
                  }
                  if (doorPosition.count) doorCounter++;
                }
              }
            }

            setTimeout(() => model.lines.push(`!{yellow} ЗАДЕЙСТВОВАНО ${doorCounter} ДВЕРЕЙ`), 0);
          } else if (command[0] === 'поиск') {
            if (command[1] === 'робот') {
              consoleInputs = SceneContextProvider.getSceneModel().gameObjects
                .filter(o => o.getTags().has('robot'))
                .map(r => roomIdByCoords(r.position.x, r.position.y));
            } else if (command[1] === 'игрок') {
              const playerPos = SceneContextProvider.getReader().getPlayer().position;
              consoleInputs = [ roomIdByCoords(playerPos.x, playerPos.y) ];
            } else {
              // noinspection NonAsciiCharacters
              const posByTarget = {
                энергия1: arrayEnergyPositions[0],
                энергия2: arrayEnergyPositions[1],
                энергия3: arrayEnergyPositions[2],
                энергия4: arrayEnergyPositions[3],
              };
              const targetPosition = posByTarget[command[1]];
              if (targetPosition) {
                consoleInputs = [ roomIdByCoords(targetPosition.x, targetPosition.y) ];
                return true;
              } else {
                setTimeout(() => model.lines.push('!{red}НЕПРАВИЛЬНАЯ ЦЕЛЬ: ' + command[1]), 0);
                consoleInputs = [];
                return false;
              }
            }
          }
        }
        return true;
      },
    }));

  };

  const generateRoom = (ox: number, oy: number) => {
    for (let x = 0; x < 9; x++) {
      for (let y = 0; y < 9; y++) {
        Builder.setTile(x + ox, y + oy, 'station-floor');
        if (y === 0 || y === 8) {
          Builder.setTile(x + ox, y + oy, 'station-wall');
        }
        if (y === 1) {
          Builder.setTile(x + ox, y + oy, 'station-wall-front');
        }
        if (x === 0 || x === 8) {
          Builder.setTile(x + ox, y + oy, 'station-wall');
        }
      }
    }
    consoleObject(ox, oy);
  };

  {
    for (let w = 0; w < 71; w++) {
      for (let h = 0; h < 71; h++) {
        Builder.setTile(w, h, 'moon-stone', true);
      }
    }
  }

  {
    for (let i = 0; i < 71; i += 10) {
      for (let j = 0; j < 71; j += 10) {
        if (Math.random() < 1 || i === 0 && j === 0) {
          generateRoom(i + 1, j + 1);
        }
      }
    }
  }

// horizontal passage
  let offsetY = 5;
  while (offsetY < 71) {
    for (let x = 10; x < 71; x += 10) {
      if (Math.random() < 1) {
        if (Builder.getTileTagsAt(x + 2, offsetY).has('-station-floor') && Builder.getTileTagsAt(x - 2, offsetY).has('-station-floor')) {
          for (let i = 0; i < 2; i++) {
            const door = new SimpleGameObject({x: x + i * 2 - 1, y: offsetY}, {
              texture: {
                atlas: {src: 'assets:/connected-tile-atlas.png', width: 24, height: 16},
                items: {
                  close: [[19, 3]],
                  open: [[20, 3]],
                }
              },
              immutableTags: ['door'],
              initialState: 'open',
              stationary: true,
            });
            Builder.addGameObject(door);
          }
          for (let j = 0; j < 2; j++) {
            const doorTop = new SimpleGameObject({x: x + j * 2 - 1, y: offsetY - 1}, {
              texture: {
                atlas: {src: 'assets:/connected-tile-atlas.png', width: 24, height: 16},
                items: {
                  close: [[19, 2]],
                  open: [[20, 2]],
                }
              },
              immutableTags: ['door'],
              initialState: 'open',
              stationary: true,
            });
            Builder.addGameObject(doorTop);
          }

          Builder.setTile(x - 1, offsetY, 'station-floor');
          Builder.setTile(x, offsetY, 'station-floor');
          Builder.setTile(x + 1, offsetY, 'station-floor');

          Builder.setTile(x, offsetY - 2, 'station-wall');
          Builder.setTile(x, offsetY + 1, 'station-wall');

          Builder.setTile(x + 1, offsetY - 1, 'station-wall-front');
          Builder.setTile(x - 1, offsetY - 1, 'station-wall-front');
          Builder.setTile(x, offsetY - 1, 'station-wall-front');

          for (let k = -2; k <= 2; k++) {
            Builder.setTile(x + k, offsetY, 'passage-robot-flag', true);
          }
        }
      }
    }
    offsetY += 10;
  }

// vertical passage
  let offsetX = 5;
  while (offsetX < 72) {
    for (let y = 10; y < 72; y += 10) {
      if (Math.random() < 1) {
        if (Builder.getTileTagsAt(offsetX, y + 3).has('-station-floor') &&
          Builder.getTileTagsAt(offsetX, y - 3).has('-station-floor')) {
          for (let i = 0; i < 2; i++) {
            const door = new SimpleGameObject({x: offsetX, y: y + i * 3 - 1}, {
              texture: {
                atlas: {src: 'assets:/connected-tile-atlas.png', width: 24, height: 16},
                items: {
                  close: [[16, 2]],
                  open: [[18, 2]],
                }
              },
              immutableTags: ['door'],
              initialState: 'open',
              stationary: true
            });
            Builder.addGameObject(door);
          }
          Builder.addGameObject(new ConsoleTerminalGameObject({x: offsetX, y: y + 2}, {
            enableEcho: true,
          }));

          Builder.setTile(offsetX - 1, y, 'station-wall');
          Builder.setTile(offsetX, y - 1, 'station-floor');
          Builder.setTile(offsetX, y, 'station-floor');
          Builder.setTile(offsetX, y + 1, 'station-floor');
          Builder.setTile(offsetX, y + 2, ['station-floor']);
          Builder.setTile(offsetX + 1, y, 'station-wall');

          for (let k = -2; k <= 3; k++) {
            Builder.setTile(offsetX, y + k, 'passage-robot-flag', true);
          }
        }
      }
    }
    offsetX += 10;
  }


// --------- object -------------

  const arrayEnergy = [];
  const arrayEnergyPositions = [];
  for (let i = 0; i < 4; i++) {
    let randomPositionX = 0;
    let randomPositionY = 0;
    let regenerate = true;
    while (regenerate) {
      randomPositionX = (Math.floor(Math.random() * 7) * 10 + 6) + 1;
      randomPositionY = Math.floor(Math.random() * 7) * 10 + 2;
      regenerate = false;
      for (const last of arrayEnergyPositions) {
        if (last.x === randomPositionX && last.y === randomPositionY ||
          !Builder.getTileTagsAt(randomPositionX, randomPositionY).has('-station-wall-front')) {
          regenerate = true;
          break;
        }
      }
    }
    arrayEnergyPositions.push({x: randomPositionX, y: randomPositionY});

    arrayEnergy.push(new EnergyAccess({x: randomPositionX, y: randomPositionY}));
  }

  for (let j = 0; j < arrayEnergy.length; j++) {
    Builder.addGameObject(arrayEnergy[j]);
  }

  // ---------- logic ---------------

  Builder.addCheckingLogic((reader: GenericReaderService) => {
    for (const energy of arrayEnergy) {
      if (energy.state !== 'broken') {
       return 'NOT_ALL_OBJECTIVES_REACHED';
      }
    }
    return null;
  });