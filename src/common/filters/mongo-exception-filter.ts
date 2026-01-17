import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { MongooseError } from 'mongoose';
import { MongoServerError } from 'mongodb';
import { prettyStringify } from '../utils/helpers.util';
import {
  formatMongoDuplicateKeyError,
  formatMongooseValidationErrors,
} from '../utils/format-mongoose-errors.util';

@Catch(MongooseError, MongoServerError)
export class MongoExceptionFilter implements ExceptionFilter {
  catch(exception: MongooseError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    console.error(prettyStringify(exception));

    let exceptionToThrow: HttpException;
    switch (exception.name) {
      case 'MongoServerError': {
        if ((exception as any)?.code === 11000) {
          const errors = formatMongoDuplicateKeyError(exception);

          exceptionToThrow = new ConflictException({
            statusCode: HttpStatus.CONFLICT,
            error: 'Conflict',
            message: errors,
          });
        } else {
          exceptionToThrow = new InternalServerErrorException(
            'Mongo server error',
          );
        }
        break;
      }
      case 'DocumentNotFoundError': {
        exceptionToThrow = new NotFoundException('Document not found.');
        break;
      }
      case 'ValidationError': {
        const errors = formatMongooseValidationErrors(exception as any);

        exceptionToThrow = new BadRequestException({
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: errors,
        });
        break;
      }
      case 'CastError': {
        exceptionToThrow = new BadRequestException({
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: {
            [(exception as any).path]: [`Invalid ${(exception as any).kind}`],
          }

        });
        break;
      }
      case 'VersionError': {
        exceptionToThrow = new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: {
            _global: ['Document was modified by another process'],
          },
        });
        break;
      }
      case 'DisconnectedError': {
        exceptionToThrow = new InternalServerErrorException(
          'Database connection lost',
        );
        break;
      }
      default: {
        exceptionToThrow = new InternalServerErrorException(
          'Unexpected database error.',
        );
        break;
      }
    }

    response
      .status(exceptionToThrow.getStatus())
      .json(exceptionToThrow.getResponse());
  }
}
