● Build an endpoint that fetches and stores the 100 most recent earthquakes into the
database
● Build a paginated endpoint to list earthquakes from the database, where multiple filters can
be applied to the result
● Build a reusable system for collecting data from API requests and storing it in the
database.
○ Collect date time that the request was made.
○ Collect some additional data e.g parameters/request body/headers (e.g. filters),
API response, or request metadata (e.g. geolocation, request execution time).
○ Apply the data collection system to the first two endpoints
● Build an endpoint to query the data collected from the previous task over a timescale.
○ Choose a single statistic of your choice e.g. most popular filter by day, number of
requests by week, average magnitude returned per month
● Describe without implementing how this system could be refactored to handle 500
requests per second
○ Include database design including descriptions of design choices.
○ No code is required.
○ Weight the pros and cons of the solution and possible alternatives
○ This task is open ended, there is no right or wrong answer
● Show error handling
● Enough testing to show your testing approach and methodology.
Bonus
Not required however knowledge on these topics is aligned with our tech stack and is highly
regarded
● NoSQL database design
● TypeScript
● JWT based authentication
● OpenAPI Documentation
● Performance tuning

Documentation
A narrative explaining your approach, including:
● How did you setup your development environment
● An explanation of your decisions, applied principles and motivations
● Approach and thought process when testing an application
● If time is limited what you would have done given more time
● If you are not familiar with DynamoDB document your thought process

Submission
Once completed, please send a link to a public git repository, with instructions on how to build and
run. This should include curl requests or a postman collection for us to test the application.