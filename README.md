# Analysis Project
Parse a CSV & provide dashboard information regarding employees, payroll, and possible anomalys.

### Running the project
**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The dashboard loads automatically using the data from the simulated database.

To load different data at any time, click **↑ Upload CSV** the new file replaces the current dataset in memory.

### Future improvements
- More advanced Frontend,  I built a single static react page, that just loads the data from memory using default formatting.  Given more time I'd replace this with an actual react project that doesn't lump together data loading, css styling, and behavior all in one blob.

- Full DB Implementation,  I just made a repository that simulates loading data from the DB.  It could easily be hooked up with Postgres, SQLServer, Supabase or whatever.  I just did that to provide the layer and how I would approach it, but not get bogged down in DB implementation details.

- CSV Upload persistence, In my implementation you can upload a csv to view more current data, but that isn't stored or persisted into the DB.  The DTO models for this exist, and could just be fed into the DB.

- Lint or code quality enforcement, If this project were persisting I'd definitely do this just to keep the codebase clean and give AI tooling something to follow.

- More testing, right now I only unit test the anomaly analysis code, but we could add testing all over the place.  I think further unit tests, and end to end tests of uploading a file, and verifying values would be good.

- CSV Parser is fragile,  I didn't really spend much time making sure if fields were missing it would error or request the proper format from a user. I just assumed the file would be in the correct format which is a BIG assumption.

- Types all exist in one file for simplicity but I'd probably make a seperate package of individual dto models that could be used by different solutions so the models would be transportable and imported as an NPM package.

### Anomaly detection rules 
- Wages higher than 20% more than someone at the same occupation and level
- Wages lower than 20% less than someone at the same occupation and level
- Higher hours than 10 in a day
- Lower hours than 4 in a day
- More than 50 hours in a week
- Less than 30 hours in a week
- Overtime is being performed before standard hours are 40
- Overtime is not being performed after standard hours are 40
- Regular hours are not worked on sunday only overtime

### Anomaly questions
- What does an average work week look like for one of our guys, is it similar to a home electrician? how do crews work, we can probably tighten the values we're looking for if we know they ALWAYS work 50 hours, or something like that.

- If we store their payment amount, we could do reverse calculations to verify that their getting paid what their supposed to by following the math outlined in the CSV.

- Do things vary in real word cases,  like does overtime sometimes not kick in until 45?  or do weekeneds always count as overtime? what other

- What are the rules regarding overtime? I assumed that any hours over 40 is overtime, but that creates a ton of anomalies so I disabled this rule until we confirm it.