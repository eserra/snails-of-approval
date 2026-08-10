# Changelog

## Beta release — 10 August 2026

### Locations

**A snail can now have more than one address.** Previously each snail had exactly one. You can now add as many as you need — a storefront, an office, a farm, a market stall, a warehouse, a pop-up, and so on — each labelled with its type and an optional name like "Union Square stall".

One location is marked as the **main** one. That's the address used when you submit the snail to Slow Food USA.

Each location can be shown or hidden on the public map. A snail with three public locations now appears as three pins, all linking back to the same page.

### Address search, fixed

Typing an address used to suggest **business names** — searching "130 W 3rd St" offered "The Village Underground" — and picking one dumped the whole thing into the address box, including neighbourhood and county clutter.

Now you get clean street addresses only. Picking one fills in the **address, city, state, ZIP and borough separately**, with the state as a two-letter code and the borough matched automatically for New York. Several businesses at the same address collapse into a single suggestion.

**Search also understands half-typed addresses now.** "201 West 72nd" used to return a road in Utah — you had to remember to type "St" before it found anything sensible. It now finds the right address as you type.

**And it looks nearby first.** Results are ranked around the chapter you're working in, or around the snail's existing address when it has one, so local matches come up before same-named streets in other states. Addresses elsewhere still appear, just further down.

### Contacts and locations

- Every snail now needs **at least one contact and one location** before it can be created, and you can't delete the last one.
- Exactly one contact and one location is always marked **main** — a lone contact is main automatically, so it's never left blank.
- The "Main" text label is now a **star**. Click the faded star next to any other row to make it the main one.
- Deleting the main contact or location hands the role to the next one automatically.

### The vote

The stage called **"Voted"** was misleading — it actually meant *waiting for the board to vote*, not *the board has voted*. It's now called **"Board Review"**.

The **committee recommendation** — the blurb written after the application and site visit — has moved out of the Pipeline box into **its own section**, where it's actually visible. It appears once a snail reaches the site-visit stage, and stays visible for awardees.

A snail can no longer be submitted for Board Review without one, the same way it can't reach the site-visit stage without a site visit report.

### Permissions

**Chapters and categories can now only be edited by admins.** These are shared across every snail, so renaming or deleting one affects the whole directory. Editors keep full access to snails, contacts and locations, and everyone can still see chapters and categories.

### Tidying up

- The **award package checklist** (stickers, digital assets, welcome letter, certificate) now only appears for **active awardees**, instead of showing "0/4 complete" on every new lead.
- The deprecated **SFNYC Legacy** field is gone from the new-snail form and from the snails list. Existing values are still readable on each snail's page.
- **Business status** options are now: *Confirmed - Active (In Business)*, *Confirmed - Permanently closed*, *To Be Confirmed*.
- Form sections are in a consistent order — Info, Links, Contacts, Locations, Map & Visibility, Pipeline, History, Tracking — matching between the new-snail form and the snail page.
- Ticking "Former Awardee" no longer makes the form jump around.
- Fixed a bug where changing the main contact left the old one still showing as main until you reloaded.

### Deployment note

Three database migrations must run before the new code goes live (business status, locations, pipeline stages). The locations migration moves address data to a new table and removes the old columns, so the order matters — old code against the new database will break.
