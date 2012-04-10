describe(".namespace", function() {
    it("records a root namespace", function() {
        MyApp = {};
        Backbone.AssociativeModel.namespace(MyApp);
        this.after(function() {  Backbone.AssociativeModel.namespace(window);  });

        expect(Backbone.AssociativeModel._namespace).toBe(MyApp);
    });

});

describe(".defaultCollection", function() {
    beforeEach(function() {
        this.MyCollection = Backbone.Collection.extend({});
        Backbone.AssociativeModel.defaultCollection(this.MyCollection);
    });

    afterEach(function() {
        this.after(function() {  Backbone.AssociativeModel.defaultCollection(Backbone.Collection);  });
    });

    it("set default collection", function() {
        expect(Backbone.AssociativeModel._defaultCollection).toBe(this.MyCollection);
    });

    it("uses default collection for new HasMany collections", function() {
        AssociatedModel = Backbone.AssociativeModel.extend({});
        SubjectModel = Backbone.AssociativeModel.extend({
            associations: function() {  this.hasMany('associatedModels');  }
        });
        this.subject = new SubjectModel();
        expect(this.subject.get('associatedModels') instanceof this.MyCollection).toBeTruthy();
    });
});
