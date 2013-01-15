describe("`delegateAttributes` property, for delegating attributes on instantiation", function() {
    beforeEach(function() {
        DelegateModel = Backbone.AssociativeModel.extend({
            associations: function() {
                this.hasOne('modelWithDelegatedAttr').viaReverseKey('delegateModel');
            }
        });

        ModelWithDelegatedAttr = Backbone.AssociativeModel.extend({
            associations: function() {  this.hasOne('delegateModel');  },

            delegateAttributes: {
                'delegatedAttrName': 'delegateModel'
            }
        });

        this.delegate = new DelegateModel();
    });

    it("does not set the attribute directly on the delegating model", function() {
        this.delegating = new ModelWithDelegatedAttr({
            delegateModel: this.delegate,
            delegatedAttrName: 'Yes'
        });
        expect(this.delegating.attributes.delegatedAttrName).not.toBeDefined();
    });

    it("delegated attributes are available in change:associationName callbacks", function() {
        ModelWithDelegatedAttr.prototype.initialize = function() {
            this.on('change:delegateModel', function(model, options) {
                expect(this.get('delegatedAttrName')).toEqual('Yes');
            },  this  );
        };

        this.delegating = new ModelWithDelegatedAttr({
            delegateModel: this.delegate,
            delegatedAttrName: 'Yes'
        });
    });
});

describe("`delegateMethods` property", function() {
    beforeEach(function() {
        DelegateModel = Backbone.AssociativeModel.extend({
            associations: function() {
                this.hasOne('modelWithDelegatedAttr').viaReverseKey('delegateModel');
            },
            delegatedMethod: function delegatedMethod(word) {
                return 'blue';
            }
        });

        ModelWithDelegatedAttr = Backbone.AssociativeModel.extend({
            associations: function() {
                this.hasOne('delegateModel');
            },

            delegateMethods: {
                'delegatedMethod': 'delegateModel',
                'delegatedMethod1 delegatedMethod2': 'delegateModel'
            }
        });

        this.delegateModel = new DelegateModel();
        this.subject = new ModelWithDelegatedAttr({delegateModel: this.delegateModel});
    });

    it("accepts a hash", function() {
        expect(this.subject.delegatedMethod).toBeDefined();
        expect(this.subject.delegatedMethod1).toBeDefined();
        expect(this.subject.delegatedMethod2).toBeDefined();
    });

    it("accepts a function that returns a hash", function() {
        ModelWithDelegatedAttr.prototype.delegateMethods = function() {
            return {
                'delegatedMethod': 'delegateModel',
                'delegatedMethod1 delegatedMethod2': 'delegateModel'
            };
        };

        this.subject = new ModelWithDelegatedAttr({delegateModel: this.delegateModel});
        expect(this.subject.delegatedMethod).toBeDefined();
        expect(this.subject.delegatedMethod1).toBeDefined();
        expect(this.subject.delegatedMethod2).toBeDefined();
    });

    it("calls the delegated method on the delegate model", function() {
        spyOn(this.delegateModel, "delegatedMethod");
        this.subject.delegatedMethod('howdy');
        expect(this.delegateModel.delegatedMethod).toHaveBeenCalledWith('howdy');
    });

    it("when calling a delegated method on an attribute that doesn't exist, it returns undefined", function() {
        this.subject.get('delegateModel').destroy();
        expect(_.isUndefined(this.subject.delegatedMethod())).toBeTruthy();
    });

    it("when a model has a delegateModel as an attribute, then that delegateModel gets destroyed, then the first model gets a second delegateModel in its place, that second delegateModel should have delegatedMethods called on it", function() {
        this.subject.get('delegateModel').destroy();
        var newDelegateModel =  new DelegateModel();
        this.subject.set({delegateModel: newDelegateModel});

        spyOn(newDelegateModel, "delegatedMethod");
        this.subject.delegatedMethod('yo');
        expect(newDelegateModel.delegatedMethod).toHaveBeenCalledWith('yo');
    });

    it("when passing a list of method names, those methods are called on the delegate model from the delegating model", function() {
        this.delegateModel.delegatedMethod1 = function () {};
        this.delegateModel.delegatedMethod2 = function () {};

        spyOn(this.delegateModel, "delegatedMethod1");
        spyOn(this.delegateModel, "delegatedMethod2");

        this.subject.delegatedMethod1('yo1');
        this.subject.delegatedMethod2('yo2');

        expect(this.delegateModel.delegatedMethod1).toHaveBeenCalledWith('yo1');
        expect(this.delegateModel.delegatedMethod2).toHaveBeenCalledWith('yo2');
    });
});

describe("#delegateAttributesInternal", function() {
    beforeEach(function() {
        DelegateModel = Backbone.AssociativeModel.extend({});

        ModelWithDelegatedAttr = Backbone.AssociativeModel.extend({
            associations: function() {  this.hasOne('delegateModel');  },
            initialize: function() {
                this.delegateAttributesInternal("delegatedAttrName1 delegatedAttrName2").toAttribute("delegateModel");
            }
        });

        this.delegateModel = new DelegateModel();
        this.subject = new ModelWithDelegatedAttr().set({delegateModel: this.delegateModel});
    });

    it("sets the delegated attribute values on the delegate model", function() {
        this.subject.set({
            delegatedAttrName1: 300,
            delegatedAttrName2: 400
        });

        expect(this.delegateModel.get('delegatedAttrName1')).toEqual(300);
        expect(this.delegateModel.get('delegatedAttrName2')).toEqual(400);
    });

    it("retrieves the delegated attributes from the delegatING model", function() {
        this.delegateModel.set({ delegatedAttrName1: 300 });
        expect(this.subject.get('delegatedAttrName1')).toEqual(300);
    });

    describe("when the delegate model is destroyed", function() {
        it("returns undefined for attributes delegated to the destroyed delegate model", function() {
            this.delegateModel.set({ delegatedAttrName1: 300 });
            this.delegateModel.destroy();
            expect(this.subject.get('delegatedAttrName1')).toBeUndefined();
        });
    });

    describe("when a different delegate model is set for the same delegated model attribute", function() {
        it("the delegatING model retrieves delegated attrs from the new delegate model", function() {
            //first delegate model
            this.delegateModel.set({ delegatedAttrName1: 300 });
            expect(this.subject.get('delegatedAttrName1')).toEqual(300);


            //second delegate model
            var secondDelegateModel = new DelegateModel({delegatedAttrName1: 500});
            this.subject.set({delegateModel: secondDelegateModel});
            expect(this.subject.get('delegatedAttrName1')).toEqual(500);
        });
    });
});

describe("#delegateAttribute", function() {
    beforeEach(function() {
        DelegateModel = Backbone.AssociativeModel.extend({
            associations: function() {
                this.hasOne('modelWithDelegatedAttr').viaReverseKey('delegateModel');
            }
        });

        ModelWithDelegatedAttr = Backbone.AssociativeModel.extend({
            associations: function() {  this.hasOne('delegateModel');  },
            initialize: function() {
                this.delegateAttribute('delegatedAttrName').toAttribute('delegateModel');
            }
        });

        this.delegateModel = new DelegateModel();
        this.subject = new ModelWithDelegatedAttr({delegateModel: this.delegateModel});
    });

    it("sets the attribute value on the delegate model", function() {
        this.subject.set({"delegatedAttrName": 22});
        expect(this.subject.get("delegatedAttrName")).toEqual(22);
    });

    it("lets the model with delegated attr retrieve the value of the delegated attr", function() {
        this.subject.set({"delegatedAttrName": 22});
        expect(this.subject.get("delegatedAttrName")).toEqual(22);
    });

    it("when {validate: true}, is passed, it calls #validate on the model with delegated attr prior to setting on the delegate model", function() {
        this.subject.validate = function() {};
        spyOn(this.subject, 'validate');
        this.subject.set({"delegatedAttrName": 22}, {validate: true});
        expect(this.subject.validate).wasCalled();
    });

    it("when a delegated attr is set on the delegating model, a change:attrName event fires on the delegating model", function() {
        var callback = jasmine.createSpy();

        this.subject.on('change:delegatedAttrName', callback, this.subject);
        this.subject.set('delegatedAttrName', 'changed', {myOption: true});
        this.subject.off('change:delegatedAttrName', callback, this.subject); //necessary otherwise later tests fail
        expect(callback).toHaveBeenCalledWith(this.delegateModel, 'changed', {myOption: true});
    });

    it("when a delegated attr is set on the model to which it is delegated, a change:attrName event fires on the delegating model", function() {
        var callback = jasmine.createSpy();

        this.subject.on('change:delegatedAttrName', callback, this.subject);
        this.delegateModel.set('delegatedAttrName', 'changed', {myOption: true});
        this.subject.off('change:delegatedAttrName', callback, this.subject); //necessary otherwise later tests fail
        expect(callback).toHaveBeenCalledWith(this.delegateModel, 'changed', {myOption: true});
    });

    it("when a change:attrName is triggered on the delegate model, a change:attrName event fires on the delegating model", function() {
        var callback = jasmine.createSpy();

        this.subject.on('change:delegatedAttrName', callback, this.subject);
        this.delegateModel.trigger('change:delegatedAttrName', this.delegateModel, 'changed');
        this.subject.off('change:delegatedAttrName', callback, this.subject); //necessary otherwise later tests fail
        expect(callback).toHaveBeenCalledWith(this.delegateModel, 'changed', undefined);
    });

    it("modelWithDelegatedAttr#previous(delegatedAttrName) does not return the previous value of the delegatedAttr, but the delegateModel argument does", function() {
        this.testPreviousCallBack = function(delegateModel, value, options){
            expect(this.previous('delegatedAttrName') === 'original').toBeFalsy();
            expect(delegateModel.previous('delegatedAttrName') === 'original').toBeTruthy();
        };

        this.subject.set('delegatedAttrName', 'original');
        this.subject.on('change:delegatedAttrName', this.testPreviousCallBack, this.subject);
        this.subject.set('delegatedAttrName', 'changed');
        this.subject.off('change:delegatedAttrName', this.testPreviousCallBack, this.subject); //necessary otherwise later tests fail
    });
});

describe("when an attribute is delegated that also has a default specified", function() {
    beforeEach(function() {
        DelegateModel = Backbone.AssociativeModel.extend({
            associations: function() {
                this.hasOne('modelWithDelegatedAttr').viaReverseKey('delegateModel');
            }
        });

        ModelWithDelegatedAttr = Backbone.AssociativeModel.extend({
            defaults: function() {
                return {
                    delegatedAttrName: 23
                };
            },

            associations: function() {  this.hasOne('delegateModel');  },

            delegateAttributes: {
                'delegatedAttrName': 'delegateModel'
            }
        });

        this.delegate = new DelegateModel();
        this.delegating = new ModelWithDelegatedAttr({
            delegateModel: this.delegate
        });
    });

    it("sets the delegated attribute to the default value on the delegate model", function() {
        expect(this.delegate.get('delegatedAttrName')).toEqual(23);
    });

    it("removes the delegated attribute and its default value from the delegating model's attributes", function() {
        expect(this.delegating.attributes.delegatedAttrName).not.toBeDefined();
    });
});

