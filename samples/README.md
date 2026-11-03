# Sample upload files

Use these on the **Upload** page to try both the success and error paths.
Regenerate them with `npm run samples` from `backend/`.

| File | Contents | Expected result |
|---|---|---|
| `valid-locations.zip` | one `locations.txt` with 8 Kuala Lumpur places | Success popup for 3 s, then 8 markers on the map |
| `invalid-two-files.zip` | two `.txt` files | Error popup: must contain exactly one .txt file |
| `invalid-text-and-image.zip` | a `.txt` file and a `.png` | Error popup: must contain exactly one .txt file |
| `invalid-csv-not-txt.zip` | a single `.csv` file | Error popup: must contain a .txt file |
| `invalid-bad-rows.zip` | a `.txt` with non-numeric, out-of-range and short rows | Error popup listing each bad line; nothing is saved |
| `invalid-empty.zip` | nothing | Error popup: the ZIP file is empty |
| `locations.txt` | the raw text file (not zipped) | Rejected in the browser: not a .zip file |
