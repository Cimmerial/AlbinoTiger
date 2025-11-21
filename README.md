AlbinoTiger Server - README

This is the local server part of your AlbinoTiger addon. Its only job is to search for files in a specific folder on your computer and send their contents to the browser addon when requested.

Step 1: VERY IMPORTANT - Set Your Project Directory

Before you run this, you MUST tell the server where your code projects are.

Open server.js in a code editor.

Find the line that says const PROJECT_DIR = ... (around line 14).

Change 'YourProjectFolder' to the actual folder you want to search.

Examples:

If your code is in ~/Documents/Code:
const PROJECT_DIR = path.join(USER_HOME, 'Documents', 'Code');

If your code is in ~/Developer:
const PROJECT_DIR = path.join(USER_HOME, 'Developer');

If your code is in C:\Users\YourName\MyProjects (on Windows):
const PROJECT_DIR = path.join(USER_HOME, 'MyProjects');

Step 2: Install Dependencies (One-Time Setup)

Open your Terminal (or Command Prompt).

Navigate to this AlbinoTiger-Server folder from the project root:

cd path/to/AlbinoTiger/AlbinoTiger-Server


Install the required packages:

npm install


Step 3: Start the Server (Do this every time)

You must do this every time you want to use the addon's file search feature.

In your terminal, from the AlbinoTiger-Server folder, run:

npm start


You should see:

--- AlbinoTiger Server ---
Serving files from: /Users/yourname/Developer/YourProjectFolder
Server listening on http://localhost:12345
Ready to connect with the AlbinoTiger addon.


Leave this terminal window open. Closing it will stop the server.