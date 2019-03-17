/**Building  web server using express**/
//expressjs.com for documentation

const courses = [

  { id: 1, name: 'course1'},
  { id: 2, name: 'course2'},
  { id: 3, name: 'course3'}
];
//Loads joi module, used to validate requests
const Joi = require('joi')
//loads express module
const express = require('express');

//express is a function that we need to call now
const app = express();
//Now we have an express application created
app.use(express.json()); //We enable json parsing in requests body


//We want to implement endpoints that respond to HTTP GET requests
app.get('/', (request,response) =>{
    //When we receive and HTTP GET request on the root of the website
    //we'll respond with a hello world
    response.send('Hello World!!!');
});

app.get('/api/courses', (request,response) =>{
    //Here server responds with an array of integers
    response.send(courses);
});

// We also want to allow parameters to access single courses

app.get('/api/courses/:id', (request,response) =>{
   //We read the parameters with request.params.
   //We send the client the response with response.send()
   const course = courses.find(c => c.id === parseInt(request.params.id));
   if (!course) response.status(404).send(`Course not found`)//404, we didn't find a course with the id passed
   response.send(course);
});

//Now we want to handle POST requests in order to create new courses
app.post('/api/courses', (request,response) =>{

    const result = validateCourse(request.body);

    if (result.error){
      return response.status(400).send(result.error.details[0].message);
    }

    const course = {
      id: courses.length + 1,
      //We assume that in the request body we have an object that represents the name of the course
      name: request.body.name
    };

    courses.push(course); //We add it to the array
    response.send(course); //We notify the client
  });

  /*************************************************************************/

  //Now we want to handle update requests (PUT)
  app.put('/api/courses/:id', (request,response) => {
    //Look if the course exists, otherwise throw 404
    const course = courses.find(c => c.id === parseInt(request.params.id));
    if (!course){
       return response.status(404).send(`Course not found`)
    }
    //Validate if the body of the request is valid, otherwise throw 400
    const result = validateCourse(request.body);

    if (result.error){
      return response.status(400).send(result.error.details[0].message);
    }
    //Update course
    course.name = request.body.name;
    //Return update response to the client
    response.send(course)
  });

  /*************************************************************************/

  app.delete('/api/courses/:id', (request,response) =>{
      //Look if the course exists, otherwise throw 404
      const course = courses.find(c => c.id === parseInt(request.params.id));
      if (!course){
        return response.status(404).send(`Course not found`)
      }
      //Validate if the body of the request is valid, otherwise throw 400
      const result = validateCourse(request.body);
      //Delete course
      const index = courses.indexOf(course);
      courses.splice(index, 1); //Method in JS to delete an element from an array
      //Return deletion response to the client
      response.send(course) //We return the object that was deleted
  });

//We use the environment variable psocess.env.PORT to choose the port we'll
//listen from, if the variable is set, we take it, otherwise we keep 3000
// as default (It's posible to set the variable in the terminal using)
// export <desired port number>
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));





function validateCourse(course){
  const schema = {
    name: Joi.string().min(3).required()
  };

  return Joi.validate(course, schema);
}
