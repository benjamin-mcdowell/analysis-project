# Analysis Project
Parse a CSV & provide dashboard information regarding employees, payroll, and possible anomalys.

### Stuff I didn't do yet ??
• Deploy it somewhere accessible (Vercel, Netlify, a VPS, etc.)
• In-depth employee analysis– drill-down views, trend charts, week-
over-week comparisons
• Make it beautiful– thoughtful UI/UX, responsive layout, charts and
visualizations
• Design a database schema and implement a simple backend to
store/query the data
• Build a file upload feature so new CSVs can be loaded into the dash-
board
• Write tests– unit tests, integration tests, or end-to-end tests

### Anomaly detection ??
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