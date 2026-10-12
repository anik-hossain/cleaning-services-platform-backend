import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { LocalAuthGuard } from 'src/modules/auth/guards/local-auth.guard';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { FirebaseAuthDto } from './dto/firebase-auth.dto';
import { FcmTokenDto } from './dto/fcm-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // *delete account
  @UseGuards(JwtAuthGuard)
  @Post('delete-account')
  async deleteAccount(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      const response = await this.authService.deleteAccount(user_id);
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to delete account',
      };
    }
  }

  // active deactive
  @UseGuards(JwtAuthGuard)
  @Get('active-deactive')
  async activeDeactive(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      const response = await this.authService.activeDeactive(user_id);
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to active deactive',
      };
    }
  }

  // *get user details
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    try {
      const user_id = req.user.userId;

      const response = await this.authService.me(user_id);

      return response;
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to fetch user details',
      };
    }
  }

  // *register user
  @Post('register')
  async create(@Body() data: CreateUserDto) {
    try {
      const first_name = data.first_name;
      const last_name = data.last_name;
      const name = first_name + ' ' + last_name;
      const email = data.email;
      const address = data.address;
      const password = data.password;
      const type = data.type;

      if (!first_name) {
        throw new HttpException('Name not provided', HttpStatus.UNAUTHORIZED);
      }

      if (!last_name) {
        throw new HttpException('Name not provided', HttpStatus.UNAUTHORIZED);
      }

      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!password) {
        throw new HttpException(
          'Password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (!address) {
        throw new HttpException(
          'Address not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const response = await this.authService.register({
        first_name: first_name,
        last_name: last_name,
        name: name,
        address: address,
        email: email,
        password: password,
        type: type,
      });

      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // *login user
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Req() req: Request,
    @Res() res: Response,
    @Body() data: { fcm_token?: string; device_type?: string },
  ) {
    try {
      const user_id = req.user.id;
      const user_email = req.user.email;

      const response = await this.authService.login({
        userId: user_id,
        email: user_email,
        fcm_token: data?.fcm_token,
        device_type: data?.device_type,
      });

      // store to secure cookies
      res.cookie('refresh_token', response.authorization.refresh_token, {
        httpOnly: true,
        secure: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
      res.json(response);
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // *update user
  @UseGuards(JwtAuthGuard)
  @Patch('update')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async updateUser(
    @Req() req: Request,
    @Body() data: UpdateUserDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    try {
      const user_id = req.user.userId;
      const response = await this.authService.updateUser(user_id, data, image);
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to update user',
      };
    }
  }

  // *forgot password
  @ApiOperation({ summary: 'Forgot password' })
  @Post('forgot-password')
  async forgotPassword(@Body() data: { email: string }) {
    try {
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.forgotPassword(email);
    } catch (error: any) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  // *verify email
  @ApiOperation({ summary: 'Verify email' })
  @Post('verify-email')
  async verifyEmail(@Body() data: VerifyEmailDto) {
    try {
      const email = data.email;
      const token = data.token;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.verifyEmail({
        email: email,
        token: token,
      });
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to verify email',
      };
    }
  }

  // *resend verification email to verify the email
  @ApiOperation({ summary: 'Resend verification email' })
  @Post('resend-verification-email')
  async resendVerificationEmail(@Body() data: { email: string }) {
    try {
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.resendVerificationEmail(email);
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to resend verification email',
      };
    }
  }

  // *reset password if user forget the password
  @ApiOperation({ summary: 'Reset password' })
  @Post('reset-password')
  async resetPassword(
    @Body() data: { email: string; token: string; password: string },
  ) {
    try {
      const email = data.email;
      const token = data.token;
      const password = data.password;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!password) {
        throw new HttpException(
          'Password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      return await this.authService.resetPassword({
        email: email,
        token: token,
        password: password,
      });
    } catch (error: any) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  // *resend token
  @ApiOperation({ summary: 'Resend reset password token' })
  @Post('resend-token')
  async resendToken(@Body() data: { email: string }) {
    try {
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.resendToken(email);
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to resend password reset token',
      };
    }
  }

  // *veify token
  @ApiOperation({ summary: 'Verify reset password token' })
  @Post('verify-token')
  async verifyToken(@Body() data: { email: string; token: string }) {
    try {
      const email = data.email;
      const token = data.token;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.verifyToken({
        email: email,
        token: token,
      });
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to verify token',
      };
    }
  }

  // change password if user want to change the password
  @ApiOperation({ summary: 'Change password' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: Request,
    @Body() data: { email: string; old_password: string; new_password: string },
  ) {
    try {
      // const email = data.email;
      const user_id = req.user.userId;

      const oldPassword = data.old_password;
      const newPassword = data.new_password;
      // if (!email) {
      //   throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      // }
      if (!oldPassword) {
        throw new HttpException(
          'Old password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (!newPassword) {
        throw new HttpException(
          'New password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      return await this.authService.changePassword({
        // email: email,
        user_id: user_id,
        oldPassword: oldPassword,
        newPassword: newPassword,
      });
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to change password',
      };
    }
  }

  /*----------------------------------------------
  // topic: maid Verification Part Start ---------->
  -----------------------------------------------*/

  // submit verification
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MAID)
  @Post('maid/verification')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'front_page', maxCount: 1 },
        { name: 'back_page', maxCount: 1 },
        { name: 'resume', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: {
          fileSize: 50 * 1024 * 1024,
        },
      },
    ),
  )
  async submitVerification(
    @Req() req: Request,
    @UploadedFiles()
    files: {
      front_page?: Express.Multer.File[];
      back_page?: Express.Multer.File[];
      resume?: Express.Multer.File[];
    },
  ) {
    try {
      const user_id = req.user.userId;
      const frontPageImage = files?.front_page ? files.front_page[0] : null;
      const backImage = files?.back_page ? files.back_page[0] : null;
      const resume = files?.resume ? files.resume[0] : null;
      const response = await this.authService.submitVerification(
        user_id,
        frontPageImage,
        backImage,
        resume,
      );

      return response;
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to submit verification',
      };
    }
  }

  // get verification status
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MAID)
  @Get('maid/verification/status')
  async getVerificationStatus(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      const response = await this.authService.getVerificationStatus(user_id);
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to get verification status',
      };
    }
  }

  /*----------------------------------------------
  // topic: maid Verification Part End ---------->
  -----------------------------------------------*/

  /*----------------------------------------------
  // topic: resume upload start ------------------>
  -----------------------------------------------*/

  //-----------------------------------------------(end)----------------------------------------------------------------------

  @ApiOperation({ summary: 'Refresh token' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('refresh-token')
  async refreshToken(
    @Req() req: Request,
    @Body() body: { refresh_token: string },
  ) {
    try {
      const user_id = req.user.userId;

      const response = await this.authService.refreshToken(
        user_id,
        body.refresh_token,
      );

      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('save-fcm-token')
  async saveFcmToken(@Req() req: Request, @Body() data: FcmTokenDto) {
    try {
      const user_id = req.user.userId;

      if (!data?.fcm_token) {
        throw new HttpException(
          'FCM token not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }

      return await this.authService.saveFcmToken({
        user_id: user_id,
        fcm_token: data.fcm_token,
        device_type: data.device_type,
      });
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('fcm-token')
  async registerFcmToken(@Req() req: Request, @Body() data: FcmTokenDto) {
    return this.authService.saveFcmToken({
      user_id: req.user.userId,
      fcm_token: data.fcm_token,
      device_type: data.device_type,
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('fcm-token')
  async removeFcmToken(@Req() req: Request, @Body() data: FcmTokenDto) {
    return this.authService.removeFcmToken(req.user.userId, data.fcm_token);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request) {
    try {
      const userId = req.user.userId;
      const response = await this.authService.revokeRefreshToken(userId);
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // ------------- Firebase Google Authentication --------------

  @ApiOperation({ summary: 'Firebase Google Authentication' })
  @Post('firebase/google')
  async firebaseGoogleAuth(@Body() firebaseAuthDto: FirebaseAuthDto) {
    try {
      const { idToken, fcm_token, device_type } = firebaseAuthDto;

      if (!idToken) {
        throw new HttpException(
          'ID Token not provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.authService.firebaseGoogleAuth(
        idToken,
        fcm_token,
        device_type,
      );

      const isNew =
        result && typeof result === 'object'
          ? !!(
              (result as any).is_new_user ??
              (result as any).isNewUser ??
              (result as any).new_user ??
              false
            )
          : false;

      if (result && typeof result === 'object') {
        return { ...(result as object), is_new_user: isNew };
      }

      return { success: true, data: result, is_new_user: isNew };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // ------------- Firebase Apple Authentication --------------

  @ApiOperation({ summary: 'Firebase Apple Authentication' })
  @Post('firebase/apple')
  async firebaseAppleAuth(@Body() firebaseAuthDto: FirebaseAuthDto) {
    try {
      const { idToken, fcm_token, device_type } = firebaseAuthDto;

      if (!idToken) {
        throw new HttpException(
          'ID Token not provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.authService.firebaseAppleAuth(
        idToken,
        fcm_token,
        device_type,
      );

      const isNew =
        result && typeof result === 'object'
          ? !!(
              (result as any).is_new_user ??
              (result as any).isNewUser ??
              (result as any).new_user ??
              false
            )
          : false;

      if (result && typeof result === 'object') {
        return { ...(result as object), is_new_user: isNew };
      }

      return { success: true, data: result, is_new_user: isNew };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // --------------change password---------

  // --------------end change password---------

  // -------change email address------
  @ApiOperation({ summary: 'request email change' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('request-email-change')
  async requestEmailChange(
    @Req() req: Request,
    @Body() data: { email: string },
  ) {
    try {
      const user_id = req.user.userId;
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.requestEmailChange(user_id, email);
    } catch (error: any) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  @ApiOperation({ summary: 'Change email address' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-email')
  async changeEmail(
    @Req() req: Request,
    @Body() data: { email: string; token: string },
  ) {
    try {
      const user_id = req.user.userId;
      const email = data.email;

      const token = data.token;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.changeEmail({
        user_id: user_id,
        new_email: email,
        token: token,
      });
    } catch (error: any) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }
  // -------end change email address------

  // --------- 2FA ---------
  @ApiOperation({ summary: 'Generate 2FA secret' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('generate-2fa-secret')
  async generate2FASecret(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      return await this.authService.generate2FASecret(user_id);
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Verify 2FA' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('verify-2fa')
  async verify2FA(@Req() req: Request, @Body() data: { token: string }) {
    try {
      const user_id = req.user.userId;
      const token = data.token;
      return await this.authService.verify2FA(user_id, token);
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Enable 2FA' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('enable-2fa')
  async enable2FA(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      return await this.authService.enable2FA(user_id);
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('disable-2fa')
  async disable2FA(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      return await this.authService.disable2FA(user_id);
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // --------- end 2FA ---------
}
