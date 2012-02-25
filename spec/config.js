describe("#namespace", function() {
    it("records a root namespace", function() {
        MyApp = {};
        Backbone.AssociativeModel.namespace(MyApp);
        this.after(function() {  Backbone.AssociativeModel.namespace(window);  });

        expect(Backbone.AssociativeModel._namespace).toBe(MyApp);
    });
});
