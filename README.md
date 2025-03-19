# Market Research Data Tool

A Next.js application that scrapes demographic and economic data for U.S. cities from city-data.com and the Bureau of Labor Statistics. This version is designed for serverless deployments and uses MongoDB for data storage. Scraping code is based on [haveitjoewei/market-research](https://github.com/haveitjoewei/market-research).

## Features

- Select states for analysis
- Set minimum population threshold for cities to include
- Scrape data from city-data.com including population, income, housing, and more
- Fetch job data from BLS
- Generate Excel reports for easy analysis
- Download generated files

## Prerequisites

- Node.js 18 or later
- A MongoDB Atlas account (free tier works fine)
- A Google Maps API key with Geocoding API enabled
- Internet access to scrape data from city-data.com and BLS

## Setup Instructions

1. Clone this repository:

```bash
git clone <repository-url>
cd market-research-app
```

2. Install dependencies:

```bash
npm install
```

3. Set up MongoDB:

   - Copy the `.env.template` file to `.env.local`
   - Follow the instructions in [MongoDB Setup Guide](MONGODB_SETUP.md)
   - Add your MongoDB connection string to the `.env.local` file:
     ```
     MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/market-research?retryWrites=true&w=majority
     ```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Serverless Deployment

### Deploying to Vercel

1. Push your code to a GitHub repository
2. Connect your repository to Vercel
3. Add the `MONGODB_URI` environment variable in the Vercel dashboard
4. Deploy your application

## How to Use

1. Enter your Google Maps API key
2. Set the minimum population threshold for cities (default: 50,000)
3. Select one or more states to analyze
4. Click "Generate Market Research"
5. Wait for the scraping to complete
6. Download the generated files from the "Generated Files" section

## How It Works

### Architecture

This application is built with:

- **Next.js**: React framework with API routes
- **MongoDB**: Database for storing scraped data and generated files
- **Cheerio**: For HTML parsing and web scraping
- **ExcelJS**: For generating Excel reports
- **Node-Geocoder**: For geocoding cities with Google Maps API

### Data Flow

1. **User Input**: The user selects states and sets parameters
2. **API Routes**: Serverless functions handle the scraping requests
3. **Data Scraping**: The app scrapes city-data.com and BLS websites
4. **MongoDB Storage**: All data is stored in MongoDB collections
5. **File Generation**: Excel reports are generated and stored in MongoDB
6. **Download**: Users can download files directly from the app

## Limitations and Considerations

### Serverless Function Limits

- Execution timeout (usually 10-60 seconds, but can be adjusted depending on the provider)
- Memory limits depending on the provider
- If you're analyzing many states, the process might time out

### Handling Larger Workloads

To handle larger workloads:

1. Process one state at a time
2. Implement a queue system for background processing
3. Consider using dedicated servers for intensive scraping

### Rate Limiting

Be aware of rate limits on:

- city-data.com
- Bureau of Labor Statistics
- Google Maps Geocoding API

Add delays between requests to avoid being blocked.

## Important Notes

- Web scraping is subject to changes in website structures. If city-data.com or BLS changes their website layout, the scraper may need to be updated.
- Be respectful of the websites being scraped. Add delays between requests and don't overload their servers.
- This tool is for educational and research purposes only.

## License

MIT License
