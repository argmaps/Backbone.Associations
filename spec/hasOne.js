describe("HasOne", function() {
    describe("when setting a hasOne association on a model", function() {
        beforeEach(function() {
            //set up has many on a model
            AssociatedModel = Backbone.AssociativeModel.extend();
            SubjectModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasOne('associatedModelKey');
                }
            });

            this.subject = new SubjectModel();
        });

        it("#get('associationName') retrieves the associated model", function() {
            var associatedModel = new AssociatedModel();
            this.subject.set('associatedModelKey', associatedModel);
            expect(this.subject.get('associatedModelKey')).toBe(associatedModel);
        });

        it("destroying an associated model causes the model that hadOne's #get('associationKey') to return undefined", function() {
            var associatedModel = new AssociatedModel();
            this.subject.set('associatedModelKey', associatedModel);
            associatedModel.destroy();
            expect(this.subject.get('associatedModelKey')).toBeUndefined();
        });
    });

    describe("when setting a hasOne association with `through`", function() {
        beforeEach(function() {
            JoinModelClass = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasOne('subjectClassModel');
                    this.hasOne('otherModel');
                }
            });

            SubjectModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasOne('joinModel');
                    this.hasOne('hmtModel').through('joinModel').viaKey('otherModel');
                }
            });

            this.subject = new SubjectModel();

            this.otherModelForJoinModel = new Backbone.AssociativeModel();
            this.joinModel = new JoinModelClass({subjectClassModel: this.subject, otherModel: this.otherModelForJoinModel});

            this.subject.set('joinModel', this.joinModel);
        });

        it("setting a joinModel on the subject causes its otherModel to be available at subject#get('hmtModel')", function() {
            expect(this.subject.get('hmtModel')).toBe(this.otherModelForJoinModel);
        });

        it("when destroying the joinModel, the otherModel is no longer returned by subject#get('hmtModel')", function() {
            this.joinModel.destroy();
            expect(this.subject.get('hmtModel')).toBeUndefined();
        });
    });

    describe("When using the #viaReverseKey('reverseKeyName') option, and then setting an associated attribute on the model whose association doesn't have the #viaReverseKey option,", function() {
        beforeEach(function() {
            DependentModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.belongsTo('independentModel');
                }
            });

            IndependentModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasOne('dependentModel').viaReverseKey('independentModel');
                }
            });

            this.independentModel = new IndependentModel();
            this.dependentModel = new DependentModel();

            this.dependentModel.set('independentModel', this.independentModel);
        });

        it("modelWithReverseKey.get('reverseKeyAssociationName') returns the associated model", function() {
            expect(this.independentModel.get('dependentModel')).toBe(this.dependentModel);
        });

        it("destroying the associated model causes it not to be returned by modelWithReverseKey.get('reverseKeyAssociationName')", function() {
            this.dependentModel.destroy();
            expect(this.independentModel.get('dependentModel')).not.toBe(this.dependentModel);
            expect(this.independentModel.get('dependentModel')).toBeUndefined();
        });
    });

    describe("When using the #viaReverseKey option with the same reverseKeyName on two different associations,", function() {
        beforeEach(function() {
            DependentModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.belongsTo('independentModel');
                }
            });

            OtherDependentModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.belongsTo('independentModel');
                }
            });

            EvenOtherDependentModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.belongsTo('independentModel');
                }
            });

            IndependentModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasOne('dependentModel').viaReverseKey('independentModel');
                    this.hasOne('otherDependentModel').viaReverseKey('independentModel');
                    this.hasMany('evenOtherDependentModels').viaReverseKey('independentModel');
                }
            });

            this.independentModel = new IndependentModel();
            this.dependentModel = new DependentModel();
            this.otherDependentModel = new OtherDependentModel();
        });

        it("setting the first association on the associated model sets the right association on the host model", function() {
            this.dependentModel.set('independentModel', this.independentModel);
            expect(this.independentModel.get('dependentModel')).toBe(this.dependentModel);
        });

        it("setting the first association on the associated model sets the right association on the associated model", function() {
            this.dependentModel.set('independentModel', this.independentModel);
            expect(this.dependentModel.get('independentModel')).toBe(this.independentModel);
        });

        it("setting the last association on the other associated model sets the right association on host model", function() {
            this.otherDependentModel.set('independentModel', this.independentModel);
            expect(this.independentModel.get('otherDependentModel')).toBe(this.otherDependentModel);
        });

        it("setting the last association on the other associated model sets the right association on the other associated model", function() {
            this.otherDependentModel.set('independentModel', this.independentModel);
            expect(this.otherDependentModel.get('independentModel')).toBe(this.independentModel);
        });

        it("setting the independentModel attr on an evenOtherDependentModel results in IndependentModel having that evenOtherDependentModel in its collection", function() {
            //this tests that setReciprocalAssociation is smart enough
            //to understand that an association called 'xs' can
            //represent a model class X.
            var evenOtherModel = new EvenOtherDependentModel();
            evenOtherModel.set('independentModel', this.independentModel);
            expect(this.independentModel.get('evenOtherDependentModels').first()).toBe(evenOtherModel);
        });
    });
});
