/**
 * X.com Tweet Processor
 * 
 * This script runs when a user visits x.com or twitter.com. It:
 * 1. Polls for tweets to appear on the page at 1-second intervals
 * 2. Once tweets are detected, processes all tweets on the page
 * 3. For each tweet, extracts the text content from all spans inside it
 * 4. Replaces the complex tweet HTML with a simple div showing just the text
 * 
 * Technical approach:
 * - Uses polling to detect when tweets are first loaded
 * - Identifies tweets using X's data-testid="tweet" attribute
 * - Extracts text content from all span elements within tweets
 * - Creates a clean display div for each tweet's text content
 */

import { handleError } from '../utils/errors';

interface TweetData {
    userName: string;
    timestamp: string;
    contents: string;
    element: HTMLElement;
    id: string;  // Adding an ID to track tweets
}

export class TweetProcessor {
    private static readonly TWEET_SELECTOR = '[data-testid="tweet"]';
    private static readonly TWEET_TEXT_SELECTOR = 'span';
    private static readonly POLL_INTERVAL = 1000; // 1 second
    private static readonly MAX_RETRIES = 30; // 30 second timeout
    private isProcessing = false;
    private tweets: TweetData[] = [];

    constructor() {
        this.start();
    }

    public async start(): Promise<void> {
        if (this.isProcessing) return;
        this.isProcessing = true;
        
        try {
            await this.waitForTweets();
            console.log('Tweets detected, beginning processing');
            await this.processAllTweets();
            console.log('Tweets processed');
        } catch (error) {
            handleError(error, 'Failed to process tweets');
            this.isProcessing = false;
        }
    }

    private async waitForTweets(): Promise<void> {
        let retries = 0;
        console.log('Starting to wait for tweets...');
        
        return new Promise((resolve, reject) => {
            const checkForTweets = () => {
                console.log(`Checking for tweets (attempt ${retries + 1}/${TweetProcessor.MAX_RETRIES})`);
                const tweets = document.querySelectorAll(TweetProcessor.TWEET_SELECTOR);
                
                if (tweets.length > 0) {
                    console.log(`Found ${tweets.length} tweets`);
                    resolve();
                } else if (retries >= TweetProcessor.MAX_RETRIES) {
                    console.log('Timed out waiting for tweets');
                    reject(new Error('Timed out waiting for tweets'));
                } else {
                    retries++;
                    console.log(`No tweets found yet, retrying in ${TweetProcessor.POLL_INTERVAL}ms...`);
                    setTimeout(checkForTweets, TweetProcessor.POLL_INTERVAL);
                }
            };
            
            checkForTweets();
        });
    }

    private async processAllTweets(): Promise<void> {
        try {
            // Find all tweets
            const tweetElements = document.querySelectorAll(TweetProcessor.TWEET_SELECTOR);
            
            // Convert to intermediate format with unique IDs and store cloned nodes
            const tweets: TweetData[] = Array.from(tweetElements).map((element, index) => ({
                id: `tweet-${index}`,
                userName: element.querySelector('[data-testid="User-Name"]')?.textContent?.trim() || '',
                timestamp: element.querySelector('time')?.getAttribute('datetime') || '',
                contents: element.querySelector('[data-testid="tweetText"]')?.textContent?.trim() || '',
                // Store the deep clone instead of HTML string
                element: element.cloneNode(true) as HTMLElement
            }));

            // Store tweets in memory
            this.tweets = tweets;

            // Find the main timeline element
            const timeline = tweetElements[0]?.closest('[role="main"]');
            if (!timeline) throw new Error('Could not find timeline element');

            // Create our container
            const container = document.createElement('div');
            container.id = 'devcon-timeline';
            
            // Replace timeline contents with our container
            timeline.innerHTML = '';
            timeline.appendChild(container);

            // Initial render
            this.renderTweets(tweets);

        } catch (error) {
            handleError(error, 'Failed to process tweets');
        }
    }

    // Add these new methods for tweet manipulation
    private renderTweets(tweetsToShow: TweetData[]): void {
        const timeline = document.getElementById('devcon-timeline');
        if (!timeline) return;

        // Clear existing tweets
        timeline.innerHTML = '';
        
        // Add cloned tweets
        tweetsToShow.forEach(tweet => {
            const tweetClone = tweet.element.cloneNode(true) as HTMLElement;
            tweetClone.id = tweet.id;
            timeline.appendChild(tweetClone);
        });
    }

    // Public methods for tweet manipulation
    public showTweets(tweetIds: string[]): void {
        const tweetsToShow = this.tweets.filter(tweet => tweetIds.includes(tweet.id));
        this.renderTweets(tweetsToShow);
    }

    public reorderTweets(tweetIds: string[]): void {
        const orderedTweets = tweetIds
            .map(id => this.tweets.find(t => t.id === id))
            .filter((tweet): tweet is TweetData => tweet !== undefined);
        this.renderTweets(orderedTweets);
    }

    public hideAllTweets(): void {
        this.renderTweets([]);
    }

    public showAllTweets(): void {
        this.renderTweets(this.tweets);
    }
}
