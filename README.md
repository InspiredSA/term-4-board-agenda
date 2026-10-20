# Inspired South Africa board agenda

Static, client-side Term 4 board preparation and Excel consolidation application.

## Heads
1. Open the app and select your school, board meeting period and planning period.
2. Complete the 26 individual discussion answers across the ten functions and any Forward priorities.
3. Keep regular **Download draft backup** copies. **Import draft / school Excel** restores a backup or original school export.
4. Review the gaps, choose the final school Excel workbook once the review gaps are resolved (or download a draft) and attach it manually to your message to Lionel.

Autosave uses browser local storage, not cloud storage. It is not encrypted or shared between devices and can be lost when browser data is cleared. Use a trusted device. Store downloads securely. Keep identifiable safeguarding cases and sensitive individual HR details in existing restricted channels.

## Consolidation
Choose Consolidation and import the Heads' original `.xlsx` exports. Schema errors are rejected. Duplicate submission IDs or school/period/meeting combinations must be resolved by deselecting superseded files. Export the unified workbook. Imported records remain only in memory; closing the page clears the consolidation session.

The workbook retains every school's RAG, material exceptions, detailed records, and reporting context. It never averages ratings or sums unlike currencies. Priority order uses school-entered urgency and impact; Not assessed sorts last. The unified report is an output, not a school-import format.

## Hosting and offline use
The app has no build step. Serve the contents of `dist/`, or unzip the offline package and open `index.html` with its adjacent files retained. All scripts, logo and Excel functionality are bundled; no CDN or analytics is used. GitHub Pages hosts only blank code and assets. Hosting providers still receive ordinary page requests, but entered responses are never transmitted by this application. The content security policy prohibits network connections and form submission.

## Schema
`inspired-board-v3`. Legacy v1/v2 backups and school exports migrate on import. Removed metadata is archived only in JSON backups, never in new Excel reports. Original v1/v2 browser storage is retained; active drafts use a separate v3 key. Unknown legacy Other schools require selection of one of the eleven listed schools. Original school workbooks have a Manifest plus Metadata, Sections, PromptAnswers and Priorities tables. Preserve their header keys. Overview, Review gaps, Field guide and Read me are derived views. Free text is written as text, never evaluated as an Excel formula. Imports containing formula cells are rejected. Maximum file size is 10 MB; maximum records per table is 2,000; text fields permit up to 30,000 characters. CSV imports are intentionally unsupported.

## Source and branding
Agenda prompts and required outputs follow **School Board Meeting Agenda – Draft 10/9**. Source Word files are not distributed. The simplified meeting setup uses 2026 Term 4 and Report Submitted date; duration and pre-meeting submission fields are removed.

Official Inspired logo and palette were verified from https://www.inspirededu.com/ on 20 October 2026. Logo asset: https://d24d7vsshzrslo.cloudfront.net/sites/company/files/styles/website_logo/public/Inspired_Logo_Colour_1.png?itok=lXOWX35i . Palette: navy #122147, secondary #5b7a95, sand #eed6ab. Inspired branding remains the property of its owner.

SheetJS Community Edition 0.20.3 is bundled from its official distribution, with its Apache 2.0 license in `vendor/`.

Only the School rating is used. Legacy board-confirmed ratings are archived in JSON backups and never override school ratings or appear in new Excel reports.

Next review date is omitted from the form and new exports. Legacy values remain archived only in JSON backups. Assessment and action due dates remain available.

Each prompt has a stable ID and its own answer in JSON, school Excel and unified Excel. Amber/Red requires issue, corrective action/decision, owner and due date for a final return. Green requires brief prompt answers but no detailed action plan. N/A requires a reason; Not assessed retains evidence requirements and remains incomplete for final submission. Review gaps link to fields. Incomplete drafts can always be saved or backed up. Changing a rating never clears details.

The standalone Prior commitments tracker and priority report-destination selector are removed. Legacy commitment records and destinations are archived in JSON backups only. Section 1 remains. The requested IT sentence about user practice is omitted.

Strategic opportunities and Evidence references standalone pages and worksheets are removed. Legacy values remain in JSON-only archives. Supporting explanation belongs within each function’s answers and optional/required follow-up.
