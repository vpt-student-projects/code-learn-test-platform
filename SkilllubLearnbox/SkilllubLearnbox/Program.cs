using SkilllubLearnbox.Services;
using SkilllubLearnbox.Utilities;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Supabase;
using Microsoft.AspNetCore.Authorization;

var builder = WebApplication.CreateBuilder(args);

Env.Load();

builder.Services.AddControllers();
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<ConfigHelper>();

var configHelper = new ConfigHelper(builder.Configuration);
builder.Services.AddSingleton(configHelper);

builder.Services.AddSingleton(provider =>
{
    var configHelper = provider.GetRequiredService<ConfigHelper>();
    return new Supabase.Client(configHelper.SupabaseUrl, configHelper.SupabaseKey);
});

builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<RoleService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<CourseService>();
builder.Services.AddScoped<QuizService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins(configHelper.AllowedOrigins)
              .WithMethods(configHelper.AllowedMethods)
              .WithHeaders(configHelper.AllowedHeaders)
              .AllowCredentials();
    });
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configHelper.JwtSecret)),
            ValidateIssuer = true,
            ValidIssuer = configHelper.JwtIssuer,
            ValidateAudience = true,
            ValidAudience = configHelper.JwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();