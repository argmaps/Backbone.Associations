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

    describe("when setting a hasOne association with includeInJSON = false", function() {
        beforeEach(function() {
            AssociatedModel = Backbone.AssociativeModel.extend({});
            SubjectModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasOne('associatedModel').includeInJSON(false);
                }
            });

            var associatedModel = new AssociatedModel();
            this.subject = new SubjectModel({'associatedModel': associatedModel});
        });

        it("subject#toJSON does not include a key for 'associatedModelKey'", function() {
            expect(_(this.subject.toJSON()).keys()).not.toContain('associatedModel');
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
            AssociatedModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.belongsTo('subjectModel');
                }
            });

            SubjectModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasOne('associatedModel').viaReverseKey('subjectModel');
                }
            });

            this.subject = new SubjectModel();
            this.associatedModel = new AssociatedModel();

            this.associatedModel.set('subjectModel', this.subject);
        });

        it("modelWithReverseKey.get('reverseKeyAssociationName') returns the associated model", function() {
            expect(this.subject.get('associatedModel')).toBe(this.associatedModel);
        });

        it("destroying the associated model causes it not to be returned by modelWithReverseKey.get('reverseKeyAssociationName')", function() {
            this.associatedModel.destroy();
            expect(this.subject.get('associatedModel')).not.toBe(this.associatedModel);
            expect(this.subject.get('associatedModel')).toBeUndefined();
        });
    });

    describe("When using the #viaReverseKey option with the same reverseKeyName on two different associations,", function() {
        beforeEach(function() {
            AssociatedModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.belongsTo('subjectModel');
                }
            });

            OtherAssociatedModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.belongsTo('subjectModel');
                }
            });

            SubjectModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasOne('associatedModel').viaReverseKey('subjectModel');
                    this.hasOne('otherAssociatedModel').viaReverseKey('subjectModel');
                }
            });

            this.subject = new SubjectModel();
            this.associatedModel = new AssociatedModel();
            this.otherAssociatedModel = new OtherAssociatedModel();
        });

        it("setting the first association on the associated model sets the right association on the host model", function() {
            this.associatedModel.set('subjectModel', this.subject);
            expect(this.subject.get('associatedModel')).toBe(this.associatedModel);
        });

        it("setting the first association on the associated model sets the right association on the associated model", function() {
            this.associatedModel.set('subjectModel', this.subject);
            expect(this.associatedModel.get('subjectModel')).toBe(this.subject);
        });

        it("setting the last association on the other associated model sets the right association on host model", function() {
            this.otherAssociatedModel.set('subjectModel', this.subject);
            expect(this.subject.get('otherAssociatedModel')).toBe(this.otherAssociatedModel);
        });

        it("setting the last association on the other associated model sets the right association on the other associated model", function() {
            this.otherAssociatedModel.set('subjectModel', this.subject);
            expect(this.otherAssociatedModel.get('subjectModel')).toBe(this.subject);
        });
    });
});
