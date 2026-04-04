import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
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
  // Flatten nested validation errors into dot-path keys (e.g. user.email).
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Parking Lots API')
    .setDescription('API documentation for Parking Lots service')
    .setVersion('1.0.0')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  // Normalize all successful responses into a shared API contract.
  app.useGlobalInterceptors(new ResponseMaskInterceptor(app.get(Reflector)));
  // Normalize all thrown errors into the same API contract.
  app.useGlobalFilters(new ApiExceptionFilter());
  // Validate and transform request payloads globally.
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      whitelist: true,
      transform: true,
      // Return validation errors in the custom error shape used by the filter.
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
