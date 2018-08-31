function defineSpecsFor(apiRoot){

  var todoRoot = apiRoot + '/todos';
  var tagRoot = apiRoot + '/tags';

  function get(url, options){
    return getRaw(url,options).then( transformResponseToJson );
  }

  function getRaw(url, options){
    return ajax("GET", url, options);
  }
  function post(url, data, options){
    options = options || {};
    options.data = JSON.stringify(data);
    return ajax("POST", url, options);
  }
  function postJson(url, data, options){
    return post(url,data,options).then( transformResponseToJson );
  }

  function patch(url, data, options){
    options = options || {};
    options.data = JSON.stringify(data);
    return ajax("PATCH", url, options);
  }
  function patchJson(url, data, options){
    return patch(url,data,options).then( transformResponseToJson );
  }

  function delete_(url, options){
    return ajax("DELETE", url, options);
  }

  function postTodoRoot(data){
    return postJson(todoRoot,data);
  }
  function getTodoRoot(){
    return get(todoRoot);
  }
1
  function postTagRoot(data){
    return postJson(tagRoot,data);
  }
  function getTagRoot(){
    return get(tagRoot);
  }

  function urlFromTodo(todo){ return todo.url; }
  function urlFromTag(tag){ return tag.url; }

  function idFromTodo(todo){ return todo.id; }
  function idFromTag(tag){ return tag.id; }

  describe( "Todo-Tag-Backend API residing at "+apiRoot, function(){

    function createFreshTodoAndGetItsUrl(params){
      var postParams = _.defaults( (params||{}), {
        title: "blah"
      });
      return postTodoRoot(postParams)
        .then( urlFromTodo );
    };

    function createFreshTagAndGetItsUrl(params){
      var postParams = _.defaults( (params||{}), {
        title: "bloh"
      });
      return postTagRoot(postParams)
        .then( urlFromTag );
    };

    function createFreshTodoAndGetItsId(params){
      var postParams = _.defaults( (params||{}), {
        title: "blah"
      });
      return postTodoRoot(postParams)
        .then( idFromTodo );
    };

    function createFreshTagAndGetItsId(params){
      var postParams = _.defaults( (params||{}), {
        title: "bloh"
      });
      return postTagRoot(postParams)
        .then( idFromTag );
    };

    // TODOS

    describe( "todo basics", function(){
      specify( "the todo endpoint responds to a GET on the todos", function(){
        var getTodoRoot = getRaw(todoRoot);
        return expect( getTodoRoot ).to.be.fulfilled;
      });

      specify( "the todo endpoint responds to a POST with the todo which was posted to it", function(){
        var postTodoRoot = postJson(todoRoot, {title:"a todo"});
        return expect( postTodoRoot ).to.eventually.have.property("title","a todo");
      });

      specify( "the todos endpoint responds successfully to a DELETE", function(){
        var deleteRoot = delete_(todoRoot);
        return expect( deleteRoot ).to.be.fulfilled;
      });

      specify( "after a DELETE the api root responds to a GET with a JSON representation of an empty array", function(){
        var deleteThenGet = delete_(todoRoot).then( getTodoRoot );

        return expect( deleteThenGet ).to.become([]);
      });
    });

    describe( "storing new todos by posting to the root url", function(){
      beforeEach(function(){
        return delete_(todoRoot);
      });

      it("adds a new todo to the list of todos at the root url", function(){
        var getAfterPost = postTodoRoot({title:"walk the dog"}).then(getTodoRoot);
        return getAfterPost.then(function(todosFromGet){
          expect(todosFromGet).to.have.length(1);
          expect(todosFromGet[0]).to.have.property("title","walk the dog");
        });
      });

      function createTodoAndVerifyItLooksValidWith( verifyTodoExpectation ){
        return postTodoRoot({title:"blah"})
          .then(verifyTodoExpectation)
          .then(getTodoRoot)
          .then(function(todosFromGet){
            verifyTodoExpectation(todosFromGet[0]);
        });
      }

      it("sets up a new todo as initially not completed", function(){
        return createTodoAndVerifyItLooksValidWith(function(todo){
          expect(todo).to.have.property("completed",false);
          return todo;
        });
      });

      it("each new todo has a url", function(){
        return createTodoAndVerifyItLooksValidWith(function(todo){
          expect(todo).to.have.a.property("url").is.a("string");
          return todo;
        });
      });
      it("each new todo has a url, which returns a todo", function(){
        var fetchedTodo = postTodoRoot({title:"my todo"})
          .then( function(newTodo){
            return get(newTodo.url);
          });
        return expect(fetchedTodo).to.eventually.have.property("title","my todo");
      });
    });


    describe( "working with an existing todo", function(){
      beforeEach(function(){
        return delete_(todoRoot);
      });

      it("can navigate from a list of todos to an individual todo via urls", function(){
        var makeTwoTodos = Q.all( [
          postTodoRoot({title:"todo the first"}),
          postTodoRoot({title:"todo the second"})
          ] );

        var getAgainstUrlOfFirstTodo = makeTwoTodos.then( getTodoRoot ).then( function(todoList){
          expect(todoList).to.have.length(2);
          return get(urlFromTodo(todoList[0]));
        });

        return expect(getAgainstUrlOfFirstTodo).to.eventually.have.property("title");
      });

      it("can change the todo's title by PATCHing to the todo's url", function(){
        return createFreshTodoAndGetItsUrl({title:"initial title"})
          .then( function(urlForNewTodo){
            return patchJson( urlForNewTodo, {title:"bathe the cat"} );
          }).then( function(patchedTodo){
            expect(patchedTodo).to.have.property("title","bathe the cat");
          });
      });

      it("can change the todo's completedness by PATCHing to the todo's url", function(){
        return createFreshTodoAndGetItsUrl()
          .then( function(urlForNewTodo){
            return patchJson( urlForNewTodo, {completed:true} );
          }).then( function(patchedTodo){
            expect(patchedTodo).to.have.property("completed",true);
          });
      });

      it("changes to a todo are persisted and show up when re-fetching the todo", function(){
        var patchedTodo = createFreshTodoAndGetItsUrl()
          .then( function(urlForNewTodo){
            return patchJson( urlForNewTodo, {title:"changed title", completed:true} );
          });

        function verifyTodosProperties(todo){
          expect(todo).to.have.property("completed",true);
          expect(todo).to.have.property("title","changed title");
        }

        var verifyRefetchedTodo = patchedTodo.then(function(todo){
          return get( todo.url );
        }).then( function(refetchedTodo){
          verifyTodosProperties(refetchedTodo);
        });

        var verifyRefetchedTodoList = patchedTodo.then(function(){
          return getTodoRoot();
        }).then( function(todoList){
          expect(todoList).to.have.length(1);
          verifyTodosProperties(todoList[0]);
        });

        return Q.all([
          verifyRefetchedTodo,
          verifyRefetchedTodoList
        ]);
      });

      it("can delete a todo making a DELETE request to the todo's url", function(){
        var todosAfterCreatingAndDeletingTodo = createFreshTodoAndGetItsUrl()
          .then( function(urlForNewTodo){
            return delete_(urlForNewTodo);
          }).then( getTodoRoot );
        return expect(todosAfterCreatingAndDeletingTodo).to.eventually.be.empty;
      });

    });

    describe("tracking todo order", function(){
      it("can create a todo with an order field", function(){
        var postResult = postTodoRoot({title:"blah",order:523});
        return expect(postResult).to.eventually.have.property("order",523);
      });

      it("can PATCH a todo to change its order", function(){
        var patchedTodo = createFreshTodoAndGetItsUrl( {order: 10} )
          .then( function(newTodoUrl){
            return patchJson(newTodoUrl,{order:95});
          });

        return expect(patchedTodo).to.eventually.have.property("order",95);
      });

      it("remembers changes to a todo's order", function(){
        var refetchedTodo = createFreshTodoAndGetItsUrl( {order: 10} )
          .then( function(newTodoUrl){
            return patchJson(newTodoUrl,{order:95});
          }).then( function( patchedTodo ){
            return get(urlFromTodo(patchedTodo));
          });

        return expect(refetchedTodo).to.eventually.have.property("order",95);
      });
    });



    // TAGS

    describe( "tag basics", function(){
      specify( "the tag endpoint responds to a GET on the tags", function(){
        var getTagRoot = getRaw(tagRoot);
        return expect( getTagRoot ).to.be.fulfilled;
      });

      specify( "the tag endpoint responds to a POST with the tag which was posted to it", function(){
        var postTagRoot = postJson(tagRoot, {title:"a tag"});
        return expect( postTagRoot ).to.eventually.have.property("title","a tag");
      });

      specify( "the tags endpoint responds successfully to a DELETE", function(){
        var deleteRoot = delete_(tagRoot);
        return expect( deleteRoot ).to.be.fulfilled;
      });

      specify( "after a DELETE the api root responds to a GET with a JSON representation of an empty array", function(){
        var deleteThenGet = delete_(tagRoot).then( getTagRoot );

        return expect( deleteThenGet ).to.become([]);
      });
    });

    describe( "storing new tags by posting to the root url", function(){
      beforeEach(function(){
        return delete_(tagRoot);
      });

      it("adds a new tag to the list of tags at the root url", function(){
        var getAfterPost = postTagRoot({title:"leisure"}).then(getTagRoot);
        return getAfterPost.then(function(tagsFromGet){
          expect(tagsFromGet).to.have.length(1);
          expect(tagsFromGet[0]).to.have.property("title","leisure");
        });
      });

      function createTagAndVerifyItLooksValidWith( verifyTagExpectation ){
        return postTagRoot({title:"bloh"})
          .then(verifyTagExpectation)
          .then(getTagRoot)
          .then(function(tagsFromGet){
            verifyTagExpectation(tagsFromGet[0]);
        });
      }

      it("each new tag has a url", function(){
        return createTagAndVerifyItLooksValidWith(function(tag){
          expect(tag).to.have.a.property("url").is.a("string");
          return tag;
        });
      });
      it("each new tag has a url, which returns a tag", function(){
        var fetchedTag = postTagRoot({title:"my tag"})
          .then( function(newTag){
            return get(newTag.url);
          });
        return expect(fetchedTag).to.eventually.have.property("title","my tag");
      });
    });


    describe( "working with an existing tag", function(){
      beforeEach(function(){
        return delete_(tagRoot);
      });

      it("can navigate from a list of tags to an individual tag via urls", function(){
        var makeTwoTags = Q.all( [
          postTagRoot({title:"tag the first"}),
          postTagRoot({title:"tag the second"})
          ] );

        var getAgainstUrlOfFirstTag = makeTwoTags.then( getTagRoot ).then( function(tagList){
          expect(tagList).to.have.length(2);
          return get(urlFromTag(tagList[0]));
        });

        return expect(getAgainstUrlOfFirstTag).to.eventually.have.property("title");
      });

      it("can change the tag's title by PATCHing to the tag's url", function(){
        return createFreshTagAndGetItsUrl({title:"initial title"})
          .then( function(urlForNewTag){
            return patchJson( urlForNewTag, {title:"chores"} );
          }).then( function(patchedTag){
            expect(patchedTag).to.have.property("title","chores");
          });
      });

      it("changes to a tag are persisted and show up when re-fetching the tag", function(){
        var patchedTag = createFreshTagAndGetItsUrl()
          .then( function(urlForNewTag){
            return patchJson( urlForNewTag, {title:"changed title"} );
          });

        function verifyTagsProperties(tag){
          expect(tag).to.have.property("title","changed title");
        }

        var verifyRefetchedTag = patchedTag.then(function(tag){
          return get( tag.url );
        }).then( function(refetchedTag){
          verifyTagsProperties(refetchedTag);
        });

        var verifyRefetchedTagList = patchedTag.then(function(){
          return getTagRoot();
        }).then( function(tagList){
          expect(tagList).to.have.length(1);
          verifyTagsProperties(tagList[0]);
        });

        return Q.all([
          verifyRefetchedTag,
          verifyRefetchedTagList
        ]);
      });

      it("can delete a tag making a DELETE request to the tag's url", function(){
        var tagsAfterCreatingAndDeletingTag = createFreshTagAndGetItsUrl()
          .then( function(urlForNewTag){
            return delete_(urlForNewTag);
          }).then( getTagRoot );
        return expect(tagsAfterCreatingAndDeletingTag).to.eventually.be.empty;
      });

    });

    // TODOS' TAGS

    describe( "todos' tags", function(){
      beforeEach(() => delete_(todoRoot).then(() => delete_(tagRoot)));

      it("can get a list of tags for each todo", function(){
        var request = createFreshTodoAndGetItsId()
        .then(() => get(todoRoot));
        return request.then((todos) => {
          expect(todos[0]).to.have.property('tags').that.is.empty;
        });
      });

      it("can create a todo, associate a tag to it, and get the tag id in the associated todo", function(){
        var tagId;
        var todoUrl;
        var request = createFreshTagAndGetItsId()
        .then((id) => tagId = id)
        .then(() => createFreshTodoAndGetItsUrl())
        .then((url) => todoUrl = url)
        .then(() => postJson(todoUrl + '/tags', {id: tagId}))
        .then(() => get(todoUrl));

        return request.then((todo) => {
          expect(todo).to.have.property('tags');
          expect(todo.tags).to.have.length(1);
          expect(todo.tags[0]).to.have.property('id', tagId);
        });


      });

      it("can create a todo, associate a tag to it, and retrieve the list by todo", function(){

        var tagId;
        var todoUrl;

        var request = createFreshTagAndGetItsId({title: 'associative tag'})
        .then((id) => tagId = id)
        .then(() => createFreshTodoAndGetItsUrl())
        .then((url) => todoUrl = url)
        .then(() => postJson(todoUrl + '/tags', {id: tagId}))
        .then(() => get(todoUrl + '/tags'));

        return request.then((tags) => {
          expect(tags).to.have.length(1);
          expect(tags[0]).to.have.property('title', 'associative tag');
        });
        
      });

      it("can create a todo, associate a tag to it, and retrieve it by its todo", function(){

        var tagId;
        var todoUrl;

        var request = createFreshTagAndGetItsId({title: 'associative tag'})
        .then((id) => tagId = id)
        .then(() => createFreshTodoAndGetItsUrl())
        .then((url) => todoUrl = url)
        .then(() => postJson(todoUrl + '/tags', {id: tagId}))
        .then(() => get(todoUrl + '/tags/' + tagId));

        return expect(request).to.eventually.have.property('title', 'associative tag');
        
      });

      it("can create a todo, associate tags to it and remove a tag association", function(){
        var tagId;
        var todoUrl;
        var request = createFreshTagAndGetItsId()
        .then((id) => tagId = id)
        .then(() => createFreshTodoAndGetItsUrl())
        .then((url) => todoUrl = url)
        .then(() => postJson(todoUrl + '/tags', {id: tagId}))
        .then(() => createFreshTagAndGetItsId())
        .then((id) => postJson(todoUrl + '/tags', {id: id}))
        .then(() => get(todoUrl + '/tags'))
        .then((data) => expect(data).to.have.length(2))
        .then(() => delete_(todoUrl + '/tags/' + tagId))
        .then(() => get(todoUrl + '/tags'));

        return expect(request).to.eventually.have.length(1);
      });

      it("can create a todo, associate tags to it and remove all tag associations", function(){
        var todoUrl;
        var request = createFreshTodoAndGetItsUrl()
        .then((url) => todoUrl = url)
        .then(() => createFreshTagAndGetItsId())
        .then((id) => postJson(todoUrl + '/tags', {id: id}))
        .then(() => delete_(todoUrl + '/tags'))
        .then(() => get(todoUrl + '/tags'));

        return expect(request).to.eventually.have.length(0);
      });
    });

    // TAGS' TODOS

    describe( "tags' todos", function(){
      beforeEach(() => delete_(todoRoot).then(() => delete_(tagRoot)));

      it("can get a list of todos for each tag", function(){
        var request = createFreshTagAndGetItsId()
        .then(() => get(tagRoot));
        return request.then((tags) => {
          expect(tags[0]).to.have.property('todos').that.is.empty;
        });
      });

      it("can create a tag, associate a todo to it, and get the todo id in the associated tag", function(){
        var todoId;
        var tagUrl;
        var request = createFreshTodoAndGetItsId()
        .then((id) => todoId = id)
        .then(() => createFreshTagAndGetItsUrl())
        .then((url) => tagUrl = url)
        .then(() => postJson(tagUrl + '/todos', {id: todoId}))
        .then(() => get(tagUrl));

        return request.then((tag) => {
          expect(tag).to.have.property('todos');
          expect(tag.todos).to.have.length(1);
          expect(tag.todos[0]).to.have.property('id', todoId);
        });


      });

      it("can create a tag, associate a todo to it, and retrieve the list by tag", function(){

        var todoId;
        var tagUrl;

        var request = createFreshTodoAndGetItsId({title: 'associative todo'})
        .then((id) => todoId = id)
        .then(() => createFreshTagAndGetItsUrl())
        .then((url) => tagUrl = url)
        .then(() => postJson(tagUrl + '/todos', {id: todoId}))
        .then(() => get(tagUrl + '/todos'));

        return request.then((todos) => {
          expect(todos).to.have.length(1);
          expect(todos[0]).to.have.property('title', 'associative todo');
        });
        
      });

      it("can create a tag, associate a todo to it, and retrieve it by its tag", function(){

        var todoId;
        var tagUrl;

        var request = createFreshTodoAndGetItsId({title: 'associative todo'})
        .then((id) => todoId = id)
        .then(() => createFreshTagAndGetItsUrl())
        .then((url) => tagUrl = url)
        .then(() => postJson(tagUrl + '/todos', {id: todoId}))
        .then(() => get(tagUrl + '/todos/' + todoId));

        return expect(request).to.eventually.have.property('title', 'associative todo');
        
      });

      it("can create a tag, associate todos to it and remove a todo association", function(){
        var todoId;
        var tagUrl;
        var request = createFreshTodoAndGetItsId()
        .then((id) => todoId = id)
        .then(() => createFreshTagAndGetItsUrl())
        .then((url) => tagUrl = url)
        .then(() => postJson(tagUrl + '/todos', {id: todoId}))
        .then(() => createFreshTodoAndGetItsId())
        .then((id) => postJson(tagUrl + '/todos', {id: id}))
        .then(() => get(tagUrl + '/todos'))
        .then((data) => expect(data).to.have.length(2))
        .then(() => delete_(tagUrl + '/todos/' + todoId))
        .then(() => get(tagUrl + '/todos'));

        return expect(request).to.eventually.have.length(1);
      });

      it("can create a tag, associate todos to it and remove all todo associations", function(){
        var tagUrl;
        var request = createFreshTagAndGetItsUrl()
        .then((url) => tagUrl = url)
        .then(() => createFreshTodoAndGetItsId())
        .then((id) => postJson(tagUrl + '/todos', {id: id}))
        .then(() => delete_(tagUrl + '/todos'))
        .then(() => get(tagUrl + '/todos'));

        return expect(request).to.eventually.have.length(0);
      });
    });

  });



  function transformResponseToJson(data){
    try{
      return JSON.parse(data);
    } catch(e) {
      var wrapped = new Error("Could not parse response as JSON.");
      wrapped.stack = e.stack;
      throw wrapped;
    }
  }

  function interpretXhrFail(httpMethod,url,xhr){
    var failureHeader = "\n\n"+httpMethod+" "+url+"\nFAILED\n\n";
    if( xhr.status == 0 ){
      return Error(
        failureHeader
        + "The browser failed entirely when make an AJAX request.\n"
        + "Either there is a network issue in reaching the url, or the\n"
        + "server isn't doing the CORS things it needs to do.\n"
        + "Ensure that you're sending back: \n"
        + "  - an `access-control-allow-origin: *` header for all requests\n"
        + "  - an `access-control-allow-headers` header which lists headers such as \"Content-Type\"\n"
        + "\n"
        + "Also ensure you are able to respond to OPTION requests appropriately. \n"
        + "\n"
      );
    }else{
      return Error(
        failureHeader
        + xhr.status + ": " + xhr.statusText + " (" + xhr.responseText.replace(/\n*$/, "") + ")"
        + "\n\n"
      );
    }
  }

  function ajax(httpMethod, url, options){
    var ajaxOptions = _.defaults( (options||{}), {
      type: httpMethod,
      url: url,
      contentType: "application/json",
      dataType: "text", // so we can explicitly parse JSON and fail with more detail than jQuery usually would give us
      timeout: 30000 // so that we don't fail while waiting on a heroku dyno to spin up
    });

    var xhr = $.ajax( ajaxOptions );

    return Q.promise( function(resolve, reject){
      xhr.success( function(){
        return resolve(xhr);
      });
      xhr.fail( function(){
        reject(interpretXhrFail(httpMethod,url,xhr));
      });
    });
  };
}
