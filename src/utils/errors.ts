export class AppError extends Error {
    constructor(
        message: string, 
        public readonly cause?: Error,
        public readonly metadata?: Record<string, any>
    ) {
        super(message);
        if (cause) {
            this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
        }
    }

    toJSON() {
        return {
            message: this.message,
            stack: this.stack,
            metadata: this.metadata,
            cause: this.cause instanceof Error ? {
                message: this.cause.message,
                stack: this.cause.stack
            } : undefined
        };
    }
}

export function handleError(
    error: unknown, 
    context: string,
    metadata?: Record<string, any>
): AppError {
    if (error instanceof AppError) {
        // Merge metadata if provided
        if (metadata) {
            return new AppError(error.message, error.cause, {
                ...error.metadata,
                ...metadata
            });
        }
        return error;
    }
    
    if (error instanceof Error) {
        return new AppError(`${context}: ${error.message}`, error, metadata);
    }
    
    return new AppError(`${context}: ${String(error)}`, undefined, metadata);
} 