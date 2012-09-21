Backbone.AssociativeModel = Backbone.Model.extend({
    constructor: function(attributes, options) {
        var attrsToDelegate = {},
            delegatedAttrNames = _(_(this.delegateAttributes).chain().keys().map(function(k) {
                return k.split(/\s+/);
            }).flatten().value());


        //extract any delegate attrs from attributes hash
        _(attributes).each(function(value, attrKey) {
            if (delegatedAttrNames.include(attrKey)) {
                attrsToDelegate[attrKey] = value;
                delete attributes[attrKey];
            }
        },  this  );

        //set all non-delegated attrs via normal instantiation
        Backbone.Model.prototype.constructor.apply(this, arguments);

        // set up delegation for delegated attributes
        this._delegateAttributes(this.delegateAttributes);

        //set all delegated attrs now that their associations have been set
        var valid = this.set(attrsToDelegate);

        //trigger special change events to update attributes obtained through associations when those associations are set during initial instantiation
        _(this.attributes).each(function(v,k) {  this.trigger('change:'+k, this, this.get(k), options);  },  this);

        //set all delegate methods now that their associations have been set
        var methodsToDelegate = _.isFunction(this.delegateMethods) ? this.delegateMethods() : this.delegateMethods;
        _(methodsToDelegate).each(function(delegateModelName, delegateMethodName){
            this._delegateMethods(delegateMethodName).toAttribute(delegateModelName);
        },  this  );

        return valid;
    },

    set: function(attributes, options) {
        //override Backbone.Model#set to initialize associations.  `Backbone.Model.prototype.constructor` calls `set` before `initialize`.
        //Hat tip to Backbone-Relational for this trick!

        if (this.associations && !this._preppedForAssociations) {
            this.prepForAssociations();
            this.associations(); //executes the `associations` function in user's model class
        }

        return Backbone.Model.prototype.set.apply(this, arguments);
    },

    prepForAssociations: function() {
        this._associations = []; //association descriptors
        this._associations.add = function(associationKey) {
            if (!_(this).chain().pluck('name').include(associationKey).value()) this.push({name: associationKey});
        };

        this._preppedForAssociations = true;
    },

    _setupAssociation: function(associatedKey, setupFunction) {
        var self = this;
        self._associations.add(associatedKey);

        setupFunction(associatedKey);

        var returnObj = {
            through: function(joinKey) {
                // Associations can obtain their content "through" other associations by specifying a key on the other association that will return models.
                // When the `through` and `viaKey` options are specified for a `hasMany` association on a model, that model will have a collection of "join models"
                // (assigned to its `joinKey` attribute), which hold both itself and the other "joined" model.  Backbone-Associative literally goes through these
                // "join models" to fetch the other "joined" models from them ("other" meaning other than our original model), depositing these in a collection of
                // joined models on the original model under an attribute with the association name specified.
                if (!_(self._associations).chain().pluck('name').include(joinKey)) throw "Model with cid "+self.cid+" does not have an association of joinModel called "+ joinKey+".";

                return _.extend(returnObj, {
                    viaKey: function(key) {
                        var associatedCollection = self.get(associatedKey);
                        if (associatedCollection && associatedCollection instanceof Backbone.Collection) {
                            var joinCollection = self.get(joinKey);
                            joinCollection.on('add', function(model) {
                                var collectionOfModelsFoundThrough = self.get(associatedKey);
                                if (collectionOfModelsFoundThrough.include(model.get(key))) return;

                                if (model.has(key)) collectionOfModelsFoundThrough.add(model.get(key));
                                else model.on('change:'+key, function(model, keyModel) {
                                    if (keyModel && collectionOfModelsFoundThrough.include(keyModel) === false) collectionOfModelsFoundThrough.add(keyModel);
                                });

                            })
                            .on('remove', function(model) {
                                var targetModel = model.get(key);
                                if (associatedCollection.include(targetModel)) associatedCollection.remove(targetModel);
                            });
                        } else {
                            //when modelThroughWhichModelFoundThroughIsFound is set, set modelFoundThrough
                            var handler = function(hostModel, joinModel, options) {
                                !!joinModel && joinModel.has(key) ? self.set(associatedKey, joinModel.get(key)) : self.unset(associatedKey);
                            };
                            self.on('change:'+joinKey, handler);
                        }
                        delete returnObj.viaKey;
                        return returnObj;
                    }
                });
            },

            viaReverseKey: function(reverseAssociationKey) {
                var associationObj = _(self._associations).detect(function(assocObj) {return assocObj.name === associatedKey;});
                associationObj.viaReverseKey = reverseAssociationKey;
                return _.extend(returnObj, {
                    as: function(associationName) {
                        associationObj.asAssociationName = associationName;
                    },

                    modelClassName: function(modelClassName) {
                        associationObj.modelClassName = modelClassName;
                    }
                });
            }
        };

        return returnObj;
    },

    setReciprocalAssociationIfPresent: function(associatedModel, associatedKey, options) {
        //3 valid cases in which we set reciprocal association:
        //1: viaReverseKey === associatedKey and there is only one association w/ viaReverseKey === associatedKey
        //2: viaReverseKey === associatedKey && associationName === model's class name & there is only one like this
        //   (associationName here means the name of the attribute whose value is an associated model or collection)
        //3: there is no association with viaReverseKey === associatedKey but there is one and only one association
        //   with association name === model's class name
        if (_.isUndefined(associatedModel._associations)) return;

        var viaReverseKeyIsSameAsAssociatedKey = function(assocObj) {
                return assocObj.viaReverseKey && _(  assocObj.viaReverseKey.split(/\s+/)  ).include(associatedKey);
            },

            rootNameSpace = Backbone.AssociativeModel._namespace,
            subNameSpaces = _(_(rootNameSpace).chain().keys().select(function(k) { return !_.isFunction(rootNameSpace[k]); }).value()),

            associationNameIsNameOfHostModelsClass = function(assocObj) {
                var classifyAssociationName = function(modelName) {
                        if (rootNameSpace[modelName]) return rootNameSpace[modelName];

                        if (modelName.charAt(modelName.length - 1) === 's') {
                            var modelNameWithoutTrailingS = modelName.substring(0, modelName.length - 1);
                            if (rootNameSpace[modelNameWithoutTrailingS]) return rootNameSpace[modelNameWithoutTrailingS];
                        }

                        var modelSubNameSpaceForThisModel = subNameSpaces.detect(function(ns) {
                            var original = _.isFunction(rootNameSpace[ns][modelName]) && new rootNameSpace[ns][modelName]() instanceof Backbone.AssociativeModel,
                                withoutTrailingS;

                            if (modelNameWithoutTrailingS) {
                                withoutTrailingS = _.isFunction(rootNameSpace[ns][modelNameWithoutTrailingS])
                                                        && new rootNameSpace[ns][modelNameWithoutTrailingS]() instanceof Backbone.AssociativeModel;
                            }

                            return original || withoutTrailingS;
                        });

                        if (rootNameSpace[modelSubNameSpaceForThisModel]) {
                            if (!modelNameWithoutTrailingS) return rootNameSpace[modelSubNameSpaceForThisModel][modelName];
                            else return rootNameSpace[modelSubNameSpaceForThisModel][modelNameWithoutTrailingS];
                        }
                    },

                    associationName = assocObj.name,
                    upperCaseAssociationName = associationName.replace(associationName.charAt(0), associationName.charAt().toUpperCase()),
                    modelClassName = assocObj.modelClassName || upperCaseAssociationName;

                return this.constructor === classifyAssociationName(modelClassName);
            },

            setReciprocalAssociation = function(assocObj) {
                var attrName = assocObj.asAssociationName || assocObj.name,
                    attr = associatedModel.get(attrName);
                if (attr instanceof Backbone.Collection) {
                    //screen out additions that could be duplicate due to change events fired on initial instantiation
                    if (attr.include(this) === false) attr.add(this, options);
                } else {
                    associatedModel.set(attrName, this, options);
                    this.on('destroy', function() {  if (associatedModel.get(attrName) === this) associatedModel.unset(attrName);  },  this);
                }
            };

        var associationsWithViaReverseKeySameAsAssociatedKey = _(associatedModel._associations).select(viaReverseKeyIsSameAsAssociatedKey),
            len = associationsWithViaReverseKeySameAsAssociatedKey.length;

        if (len === 1) {
            setReciprocalAssociation.call(this, associationsWithViaReverseKeySameAsAssociatedKey[0]);
        } else if (len > 1) {
            var associationsWithSameViaReverseKeyAndModelName = _(associationsWithViaReverseKeySameAsAssociatedKey).select(associationNameIsNameOfHostModelsClass, this);
            if (associationsWithSameViaReverseKeyAndModelName.length === 1) setReciprocalAssociation.call(this, associationsWithSameViaReverseKeyAndModelName[0]);
        } else if (len === 0) {
            var associationsWithSameModelName = _(associatedModel._associations).chain().select(associationNameIsNameOfHostModelsClass, this);
            associationsWithSameModelName.each(setReciprocalAssociation, this);
        }
    },

    hasMany: function(associatedKey) {
        var self = this,
            setupHasMany = function(associatedKey, collection) {
                var prepHasManyCollection = function(associatedKey, collection) {
                    collection || (collection = new Backbone.AssociativeModel._defaultCollection());
                    collection.on('destroy', collection.remove, collection)
                        .on('add', function(model, collection, options) {  self.trigger('add:'+associatedKey, model, collection, options);  })
                        .on('add', function(model, collection, options) {  self.setReciprocalAssociationIfPresent(model, associatedKey, options);  })
                        .on('remove', function(model, collection, options) {  self.trigger('remove:'+associatedKey, model, collection, options);});
                    return collection;
                };

                var hasManyCollection = prepHasManyCollection(associatedKey, collection);

                self.set(associatedKey, hasManyCollection);
            };

        var returnObj = _.extend(this._setupAssociation(associatedKey, setupHasMany), {
            collection: function(CustomCollectionClass) {
                setupHasMany(associatedKey, new CustomCollectionClass());
                return returnObj;
            },

            fromAttributes: function(attrNameArray) {
                var aggregateCollection = self.get(associatedKey), fromAttribute, handler;

                _.each(attrNameArray, function(attrName) {
                    if (!_(self._associations).chain().pluck('name').include(attrName)) throw "Model with cid "+self.cid+" does not have an association called "+ attrName+".";

                    fromAttribute = self.get(attrName);
                    if (fromAttribute instanceof Backbone.Collection) {
                        fromAttribute.on('add', aggregateCollection.add, aggregateCollection).on('remove', aggregateCollection.remove, aggregateCollection);
                    } else {
                        //if the fromAttribute is a model, add it to aggregateCollection when it gets set on host model, and remove it when it gets unset
                        handler = function(hostModel, fromAttributeVal) {
                            if (!!fromAttributeVal && hostModel.has(attrName)) {
                                if (aggregateCollection.include(fromAttributeVal) === false) aggregateCollection.add(fromAttributeVal);
                                if (hostModel.previous(attrName) && hostModel.previous(attrName) !== fromAttributeVal) aggregateCollection.remove(hostModel.previous(attrName));
                            } else {
                               aggregateCollection.remove(fromAttributeVal);
                            }
                        };
                        self.on('change:'+attrName, handler);
                    }
                });
                return returnObj;
            }
        });

        return returnObj;
    },

    //`hasOne` associations serve 2 purposes:
    //(1) Give you a convenient place to document related models you'll be setting as attributes on a given model.
    //(2) Handle serializing and deserializing these models into and out of JSON.
    hasOne: function(associatedKey) {
        var self = this,
            setHasOneBindings = function(associatedKey) {
                var handler = function(hostModel, associatedModel, options) {
                    if (!associatedModel || associatedModel instanceof Backbone.AssociativeModel === false) return;
                    hostModel.setReciprocalAssociationIfPresent(associatedModel, associatedKey, options);
                    associatedModel.on('destroy', function(model, collection, options) {
                        if (hostModel.get(associatedKey) === associatedModel) hostModel.unset(associatedKey, options);
                    });
                };
                self.on('change:'+associatedKey, handler);
            };

        return this._setupAssociation(associatedKey, setHasOneBindings);
    },

    belongsTo: function(associatedKey) {
        var self = this,
            setBelongsToBindings = function(associatedKey) {
                var handler = function(hostModel, associatedModel, options) {
                    if (!associatedModel || associatedModel instanceof Backbone.AssociativeModel === false) return;
                    hostModel.setReciprocalAssociationIfPresent(associatedModel, associatedKey, options);
                    associatedModel.on('destroy', function(model, collection, options) {  hostModel.destroy(options);  });
                };
                self.on('change:'+associatedKey, handler);
            };

        return this._setupAssociation(associatedKey, setBelongsToBindings);
    },

    toJSON: function() {
        var json = {};

        _.each(this.attributes, function(value, key) {
            if (value) {
                if (value.toJSON) {
                    if (!value.isEmpty || !value.isEmpty()) {
                        json[key] = value.toJSON();
                    }
                } else {
                    json[key] = value;
                }
            }
        },  this  );

        return json;
    },

    /************************ DELEGATION ************************/
    // Override this with a hash of attributes to delegate.
    // Keys are space-delimited attribute names; values are delegate model names.
    delegateAttributes: {},

    // Override this with a hash of methods to delegate, or a function returning one.
    // Keys are space-delimited method names; values are delegate model names.
    delegateMethods: {},

    _delegateMethods: function(methodName) {
        var self = this,
            methodNames = methodName.split(/\s+/);

        return {
            toAttribute: function(delegateModelAttributeName) {
                _.each(methodNames, function(methodName) {
                    self[methodName] = function() {
                        var delegateModel = this.get(delegateModelAttributeName);
                        return delegateModel ? delegateModel[methodName].apply(delegateModel, arguments) : undefined;
                    };
                });
            }
        };
    },

    delegateAttribute: function(attrName) {
        return this.delegateAttributesInternal(attrName);
    },

    _delegateAttributes: function(delegatedAttrMap) {
    /*
        looks like:
        {
            'attr1 attr2 attr3': 'delegateModel'
        }
     */
        _(delegatedAttrMap).each(function(delegateModel, delegatedAttributes) {
            this.delegateAttributesInternal(delegatedAttributes).toAttribute(delegateModel);
        },  this  );
    },

    delegateAttributesInternal: function(attributeNames) {
        var self = this,
            delegatedAttrsMap = this.delegatedAttrsMap || this.setupDelegatedAttributes();

        return {
            toAttribute: function(delegateModelAttributeName) {
                var delegateModel = self.get(delegateModelAttributeName),
                    delegatedAttrChanged;

                var attributeNameList = attributeNames.split(/\s+/);
                _.each(attributeNameList, function(attributeName) {
                    delegatedAttrsMap[attributeName] = delegateModelAttributeName;

                    delegatedAttrChanged = function(delegateModel, changedAttrVal, options) {
                        this.trigger('change:'+attributeName, delegateModel, changedAttrVal, options);
                    };

                    if (delegateModel) {
                        delegateModel.on('change:'+attributeName, delegatedAttrChanged, self);

                        self.on('change:'+delegateModelAttributeName, function(delegatingModel, delegateModel, options) {
                            if (!delegateModel) delegatingModel.off('change:'+attributeName, delegatedAttrChanged, self);
                        });
                    } else {
                        self.on('change:'+delegateModelAttributeName, function(delegatingModel, delegateModel, options) {
                            if (delegateModel) delegatingModel.on('change:'+attributeName, delegatedAttrChanged, self);
                        });
                    }
                });
            }
        };
    },

    setupDelegatedAttributes: function() {
        this.delegatedAttrsMap = {};
        this.get = this.getWithDelegates;
        this.set = this.setWithDelegates;
        return this.delegatedAttrsMap;
    },

    getWithDelegates: function(attrName) {
        //NOTE: This overrides Backbone.AssociativeModel.get()
        var directAttrVal = this.attributes[attrName];
        if (typeof directAttrVal !== 'undefined') return directAttrVal;

        if (this.delegatedAttrsMap[attrName]) {
            var delegateModel = this.get(this.delegatedAttrsMap[attrName]);
            if (delegateModel) return delegateModel.get(attrName);
        }
    },

    setWithDelegates: function(key, value, options) {
        //NOTE: This overrides Backbone.AssociativeModel.set()
        var attrHash;
        if (_.isObject(key)) {
            attrHash = _.clone(key); //by cloning we avoid losing delegated values on redo of #setWithUndoableCmd above
            options = value;
        } else {
            attrHash = {};
            attrHash[key] = value;
        }

        options || (options = {});

        // Run validation on host model before setting, so that host
        // model can run its own validations against delegated
        // attributes.
        if (!this._validate(attrHash, options)) return false;

        var delegatedAttrsMap = this.delegatedAttrsMap,
            delegatedAttrNames = _(attrHash).chain()
                                            .keys()
                                            .select(function(key) {
                                                return _(delegatedAttrsMap).chain().keys().include(key).value();
                                            })
                                            .value();

        if (delegatedAttrNames.length > 0) {
            var delegatedAttrsGroupedByDelegateModel =  _(delegatedAttrNames).groupBy(function(name) {  return delegatedAttrsMap[name];  }),
                delegateAttrHashForOneModel, delegateModel;

            _(delegatedAttrsGroupedByDelegateModel).each(function(delegateAttrNameArray, delegateModelName) {
                delegateAttrHashForOneModel = {};

                _(delegateAttrNameArray).each(function(delegateAttrName) {
                    delegateAttrHashForOneModel[delegateAttrName] = attrHash[delegateAttrName];
                    delete attrHash[delegateAttrName];
                });

                delegateModel = this.get(delegateModelName);
                delegateModel.set(delegateAttrHashForOneModel, options);
            },  this  );
        }

        if (  _(attrHash).isEmpty() === false  )  Backbone.AssociativeModel.prototype.set.apply(this, [attrHash, options]);
        return this;
    }
},
{
    //Optionally, call `Backbone.AssociativeModel.namespace` to set a namespace in which Backbone-Associative should
    //search for your models (used in `viaReverseKey` to look up models).  You can pass either a string to be eval'ed,
    //or a reference to the namespace object.  Models can be 2 levels deep.  Defaults to `window`.
    namespace: function(nameSpace) {
        this._namespace = _.isString(nameSpace) ? eval(nameSpace) : nameSpace;
    },

    _namespace: window,

    defaultCollection: function(defaultCollection) {
        this._defaultCollection = _.isString(defaultCollection) ? eval(defaultCollection) : defaultCollection;
    },

    _defaultCollection: Backbone.Collection
});
