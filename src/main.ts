import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { ResponseMaskInterceptor } from './common/interceptors/response-mask.interceptor';

interface ValidationIssue {
  property: string;
  constraints?: Record<string, string>;
  children?: ValidationIssue[];
}

function flattenValidationErrors(
  errors: ValidationIssue[],
  parentPath = '',
): Record<string, string> {
  return errors.reduce<Record<string, string>>((validationMessages, error) => {
    const propertyPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      const [firstMessage] = Object.values(error.constraints);

      if (firstMessage) {
        validationMessages[propertyPath] = firstMessage;
      }
    }

    if (error.children && error.children.length > 0) {
      Object.assign(
        validationMessages,
        flattenValidationErrors(error.children, propertyPath),
      );
    }

    return validationMessages;
  }, {});
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalInterceptors(new ResponseMaskInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors: ValidationIssue[]) =>
        new BadRequestException({
          message: 'Validation error',
          validation: flattenValidationErrors(errors),
        }),
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
