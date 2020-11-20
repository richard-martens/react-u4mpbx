import FieldError from "./FieldError";
import NotFoundError from "./NotFoundError";
import MultipleError from "./MultipleError";

class Service {
  constructor() {
    this.data = {
      teams: [
        {
          id: 1,
          name: "Mönchen Gladbach"
        },
        {
          id: 2,
          name: "1. FC Köln"
        },
        {
          id: 3,
          name: "Bayer Leverkusen"
        },
        {
          id: 4,
          name: "FC Bayern"
        },
        {
          id: 5,
          name: "Schalke"
        },
        {
          id: 6,
          name: "Vfb"
        },
        {
          id: 7,
          name: "Freiburg"
        },
        {
          id: 8,
          name: "SGE"
        },
        {
          id: 9,
          name: "Arminia"
        }
      ],
      matches: [
        {
          id: 1,
          host: {
            id: 4,
            goals: 8,
            name: "FC Bayern"
          },
          guest: {
            id: 5,
            goals: 0,
            name: "Schalke"
          },
          gameDay: "2020-01-01"
        },
        {
          id: 2,
          host: {
            id: 6,
            goals: 2,
            name: "Vfb"
          },
          guest: {
            id: 7,
            goals: 3,
            name: "Freiburg"
          },
          gameDay: "2020-02-01"
        },
        {
          id: 3,
          host: {
            id: 8,
            goals: 1,
            name: "SGE"
          },
          guest: {
            id: 9,
            goals: 1,
            name: "Arminia"
          },
          gameDay: "2020-03-01"
        }
      ]
    };

    this.metadata = {
      entities: [
        {
          name: "team",
          collection: "teams",
          paths: ["/team/:id", "/teams"],
          sort: this.sortTeams,
          properties: [
            {
              name: "id",
              type: "number",
              isKey: true,
              autoIncrement: true
            },
            { name: "name", type: "string", required: true }
          ]
        },
        {
          name: "match",
          collection: "matches",
          paths: ["/match/:id", "/matches"],
          sort: this.sortMatch,
          validate: this.validateMatch,
          properties: [
            {
              name: "id",
              type: "number",
              isKey: true,
              autoIncrement: true
            },
            {
              name: "gameDay",
              type: "date",
              required: true
            },
            {
              name: "host",
              type: "participant",
              required: true
            },
            {
              name: "guest",
              type: "participant",
              required: true
            }
          ]
        }
      ],
      types: [
        {
          name: "participant",
          properties: [
            {
              name: "id",
              type: "number",
              required: true
            },
            {
              name: "name",
              type: "string",
              required: true
            },
            {
              name: "goals",
              type: "number",
              min: 0,
              required: true
            }
          ]
        }
      ]
    };
  }

  createEntity(path, data) {
    return new Promise((resolve, reject) => {
      try {
        let metadata = this.getMetadata(path),
          entitySet = this.data[metadata.collection];

        if (!path) {
          throw new Error("Pfad nicht angegeben");
        }

        this.determineEntity(metadata, entitySet, "create", data);
        this.validateEntity(metadata, entitySet, "create", data);

        entitySet.push(Object.assign({}, data));
        resolve(data);
      } catch (e) {
        reject(e);
      }
    });
  }

  readEntity(path) {
    return new Promise((resolve, reject) => {
      try {
        let metadata = this.getMetadata(path),
          entitySet = this.data[metadata.collection];

        if (!path) {
          throw new Error("Pfad nicht angegeben");
        }

        let result = entitySet.find(entity =>
          this.entityEquals(path, metadata, entity)
        );

        if (result) {
          resolve(Object.assign({}, result));
        } else {
          throw new NotFoundError(`Entität nicht gefunden`);
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  readEntities(path) {
    return new Promise((resolve, reject) => {
      try {
        let metadata = this.getMetadata(path),
          entitySet = this.data[metadata.collection];

        if (!path) {
          throw new Error("Pfad nicht angegeben");
        }

        let result = entitySet.filter(entity =>
          this.entityEquals(path, metadata, entity)
        );

        if (result && !result.length) {
          resolve(result);
        }

        if (metadata.sort) {
          result = result.sort(metadata.sort);
        }

        resolve(result.map(entity => Object.assign({}, entity)));
      } catch (e) {
        reject(e);
      }
    });
  }

  updateEntity(path, data) {
    return new Promise((resolve, reject) => {
      try {
        let metadata = this.getMetadata(path),
          entitySet = this.data[metadata.collection];

        if (!path) {
          throw new Error("Pfad nicht angegeben");
        }

        let result = entitySet.find(entity =>
          this.entityEquals(path, metadata, entity)
        );

        if (result) {
          Object.assign(result, data);

          this.determineEntity(metadata, entitySet, "update", result);
          this.validateEntity(metadata, entitySet, "update", result);

          resolve(Object.assign({}, result));
        } else {
          throw new NotFoundError();
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  deleteTeam(path) {
    return new Promise((resolve, reject) => {
      try {
        let metadata = this.getMetadata(path),
          entitySet = this.data[metadata.collection];

        if (!path) {
          throw new Error("Pfad nicht angegeben");
        }

        let result = entitySet.find(entity =>
          this.entityEquals(path, metadata, entity)
        );

        if (result) {
          let index = entitySet.indexOf(result);

          entitySet.splice(index, 1);
          resolve();
        } else {
          throw new NotFoundError();
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  entityEquals(path, metadata, entity) {
    let pathRegex,
      properties = [],
      matches,
      noFilter;

    metadata.paths.find(metadataPath => {
      //nach dem Pfad aus den Metadaten suchen, der zum Abfrage-Path passt
      let paramNames = metadataPath.match(/:\w+/g);

      properties = [];
      matches = [];
      pathRegex = "/" + metadataPath.replace("/", "/") + "/";

      if (!paramNames) {
        noFilter = true;
        return metadataPath === path;
      } else {
        paramNames.forEach(paramName => {
          let property = metadata.properties.find(
              property => ":" + property.name === paramName
            ),
            propertyRegex;

          if (property) {
            properties.push(property);

            if (property.type === "number") {
              propertyRegex = "([0-9]+)";
            } else {
              propertyRegex = "(.[^/]+)";
            }

            pathRegex = pathRegex.replace(paramName, propertyRegex);
          }
        });

        matches = path.match(pathRegex);

        return matches && matches.length && path === matches[0];
      }
    });

    //alert(matches.length); 0

    if (noFilter) {
      //lesen aller Entitäten
      return true;
    }

    // fehlgeschlagene Vergleiche sammeln
    let results = properties.filter(
      (property, index) => entity[property.name] != matches[index + 1]
    );

    return !results || !results.length;
  }

  getMetadata(path) {
    let metadata = this.metadata.entities.filter(
      entity =>
        entity.paths.filter(entityPath => {
          let entityStrings = entityPath.match(/\/\w+/);

          if (!entityStrings || !entityStrings.length) {
            return false;
          }

          return path.startsWith(entityStrings[0]);
        }).length
    );

    if (!metadata || !metadata.length) {
      throw new Error(`Zum Pfad "${path}" konnte keine Entität ermittelt`);
    }

    if (metadata.length > 1) {
      throw new Error(
        `Pfad ${path} konnte nicht eindeutig einer Entität zugeordnet werden`
      );
    }

    return metadata[0];
  }

  determineEntity(metadata, entitySet, operation, data) {
    if (operation === "create") {
      metadata.properties.forEach(property => {
        if (property.autoIncrement) {
          let maxValue = -1;

          entitySet.forEach(entity => {
            maxValue =
              entity[property.name] > maxValue
                ? entity[property.name]
                : maxValue;
          });

          data[property.name] = ++maxValue;
        }
      });
    }

    if (metadata.determine) {
      metadata.determine(metadata, entitySet, operation, data);
    }
  }

  validateEntity(metadata, entitySet, operation, data) {
    let error = new MultipleError();

    metadata.properties.forEach(property => {
      if (property.required && !data[property.name]) {
        error.errors.push(new FieldError(property.name));
      }
    });

    switch (error.errors.length) {
      case 0:
        break;
      case 1:
        throw error.errors[0];
      default:
        throw error;
    }

    if (metadata.validate) {
      metadata.validate(metadata, entitySet, operation, data);
    }
  }

  sortTeams(team1, team2) {
    if (team1.name > team2.name) {
      return 1;
    }
    if (team1.name < team2.name) {
      return -1;
    }

    return 0;
  }

  validateMatch(metadata, entitySet, operation, data) {
    if (data.host.id === data.guest.id) {
      throw new FieldError(
        "guest.id",
        "Wählen Sie zwei unterschiedliche Teams aus"
      );
    }
  }

  sortMatch(a, b) {
    if (a.gameDay > b.gameDay) {
      return 1;
    }
    if (a.gameDay < b.gameDay) {
      return -1;
    }
    if (a.host.name > b.host.name) {
      return 1;
    }
    if (a.guest.name < b.guest.name) {
      return -1;
    }

    return 0;
  }

  readAll() {
    return new Promise((resolve, reject) => {
      resolve(this.data);
    });
  }
}

const service = new Service();

export default service;
