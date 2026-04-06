# Analysis Project
Parse a CSV & provide dashboard information regarding employees, payroll, and possible anomalys.

### Running the project


### Future improvements
- Full DB Implementation,  I just made a repository that simulates loading data from the DB.  It could easily be hooked up with Postgres, SQLServer, Supabase or whatever.  I just did that to provide the layer and how I would approach it, but not get bogged down in DB implementation details.

- CSV Upload persistence, In my implementation you can upload a csv to view more current data, but that isn't stored or persisted into the DB.  The DTO models for this exist, and could just be fed into the DB.

- Lint or code quality enforcement, If this project were persisting I'd definitely do this just to keep the codebase clean and give AI tooling something to follow.

- CSV Parser is fragile,  I didn't really spend much time making sure if fields were missing it would error or request the proper format from a user. I just assumed the file would be in the correct format which is a BIG assumption.

- Types all exist in one file for simplicity but I'd probably make a seperate package of individual dto models that could be used by different solutions so the models would be transportable and imported as an NPM package.



• In-depth employee analysis– drill-down views, trend charts, week-
over-week comparisons
• Make it beautiful– thoughtful UI/UX, responsive layout, charts and
visualizations
• Write tests– unit tests, integration tests, or end-to-end tests

### Anomaly detection 
- Wages higher than 20% more than someone at the same occupation and level
- Wages lower than 20% less than someone at the same occupation and level
- Higher hours than 10 in a day
- Lower hours than 4 in a day
- More than 50 hours in a week
- Less than 30 hours in a week
- Overtime is being performed before standard hours are 40
- Overtime is not being performed after standard hours are 40

### Anomaly questions
- What does an average work day look like for one of our users, is it similar to a home electrician? how do crews work, we can probably tighten the values we're looking for if we know they ALWAYS work 50 hours, or something like that.

- If we store their payment amount, we could do reverse calculations to verify that their getting paid what their supposed to by following the math outlined in the CSV.

- Do things vary in real word cases,  like does overtime sometimes not kick in until 45?  or do weekeneds always count as overtime? what other