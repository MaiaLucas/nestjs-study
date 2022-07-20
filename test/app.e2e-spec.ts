import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from '../src/app.module';
import * as pactum from 'pactum';
import { AuthDto } from '../src/auth/dto';
import { EditUserDto } from '../src/user/dto';
import { CreateBookmarkDto, EditBookmarkDto } from '../src/bookmark/dto';

describe('App e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    await app.init();
    await app.listen(3333);
    prisma = app.get(PrismaService);

    await prisma.cleanDb();
    pactum.request.setBaseUrl('http://localhost:3333');
  });

  afterAll(() => {
    app.close();
  });

  describe('Auth', () => {
    const dto: AuthDto = {
      email: 'test@gmail.com',
      password: '1234',
    };
    describe('Signup', () => {
      it('should throw if email empty', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({
            password: dto.password,
          })
          .expectStatus(400);
      });

      it('should throw if password empty', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({
            email: dto.email,
          })
          .expectStatus(400);
      });

      it('should throw if no body provided', () => {
        return pactum.spec().post('/auth/signup').expectStatus(400);
      });

      it('should signup', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody(dto)
          .expectStatus(201);
      });
    });

    describe('Signin', () => {
      it('should throw if email empty', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({
            password: dto.password,
          })
          .expectStatus(400);
      });

      it('should throw if password empty', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({
            email: dto.email,
          })
          .expectStatus(400);
      });

      it('should throw if no body provided', () => {
        return pactum.spec().post('/auth/signin').expectStatus(400);
      });

      it('should signin', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody(dto)
          .expectStatus(200)
          .stores('userAt', 'access_token');
      });
    });
  });

  describe('User', () => {
    describe('Get me', () => {
      it('should get current user', () => {
        return pactum
          .spec()
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .get('/users/me')
          .expectStatus(200);
      });
    });

    describe('Edit User by id', () => {
      const dto: EditUserDto = {
        email: 'test-edit@gmail.com',
        firstName: 'Test Edit',
      };
      it('should edit user by id', () => {
        return pactum
          .spec()
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody(dto)
          .patch('/users')
          .expectStatus(200);
      });
    });
  });

  describe('Bookmark ', () => {
    describe('Get Empty Bookmarks', () => {
      it('should get empty bookmarks', () => {
        return pactum
          .spec()
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .get('/bookmarks')
          .expectStatus(200)
          .expectBody([]);
      });
    });

    describe('Create Bookmark', () => {
      const dto: CreateBookmarkDto = {
        title: 'Test Bookmark',
        link: 'https://google.com.br',
      };

      it('should throw if title empty', () => {
        return pactum
          .spec()
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            link: dto.link,
          })
          .post('/bookmarks')
          .expectStatus(400);
      });

      it('should throw if body empty', () => {
        return pactum
          .spec()
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({})
          .post('/bookmarks')
          .expectStatus(400);
      });

      it('should throw if link empty', () => {
        return pactum
          .spec()
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            title: dto.title,
          })
          .post('/bookmarks')
          .expectStatus(400);
      });

      it('should create bookmark', () => {
        return pactum
          .spec()
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody(dto)
          .post('/bookmarks')
          .expectStatus(201)
          .stores('bookmarkId', 'id');
      });
    });

    describe('Get Bookmarks', () => {
      it('should get bookmarks', () => {
        return pactum
          .spec()
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .get('/bookmarks')
          .expectStatus(200)
          .expectJsonLength(1);
      });
    });

    describe('Get Bookmark By Id', () => {
      it('should get bookmark by id', () => {
        return pactum
          .spec()
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .get('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .expectStatus(200)
          .expectBodyContains('$S{bookmarkId}');
      });
    });

    describe('Edit Bookmark By Id', () => {
      const dto: EditBookmarkDto = {
        title: 'Test Edit Bookmark',
        description: 'Test Description',
        link: 'https://www.youtube.com/watch?v=GHTA143_b-s',
      };
      it('should edit bookmark by id', () => {
        return pactum
          .spec()
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .patch('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withBody(dto)
          .expectStatus(200)
          .expectBodyContains('$S{bookmarkId}')
          .expectBodyContains(dto.title)
          .expectBodyContains(dto.description)
          .expectBodyContains(dto.link);
      });
    });

    describe('Delete Bookmark By Id', () => {
      it('should delete bookmark by id', () => {
        return pactum
          .spec()
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .delete('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .expectStatus(204);
      });

      it('should get empty bookmarks', () => {
        return pactum
          .spec()
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .get('/bookmarks')
          .expectStatus(200)
          .expectJsonLength(0);
      });
    });
  });

  it.todo('should pass');
});
