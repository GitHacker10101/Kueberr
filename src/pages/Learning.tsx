import React from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { BookOpen, PlayCircle, Award, TrendingUp, BarChart, Brain } from 'lucide-react';

const Learning = () => {
  const courses = [
    {
      id: 1,
      title: "Stock Market Basics",
      description: "Learn the fundamental concepts of stock trading, market structure, and how to place your first trade.",
      level: "Beginner",
      duration: "2h 30m",
      lessons: 12,
      progress: 0,
      icon: <TrendingUp className="w-6 h-6 text-green-500" />,
      color: "border-green-500/20"
    },
    {
      id: 2,
      title: "Technical Analysis Masterclass",
      description: "Master chart patterns, indicators (RSI, MACD), and price action strategies.",
      level: "Intermediate",
      duration: "5h 15m",
      lessons: 24,
      progress: 35,
      icon: <BarChart className="w-6 h-6 text-blue-500" />,
      color: "border-blue-500/20"
    },
    {
      id: 3,
      title: "AI-Powered Trading Strategies",
      description: "Understand how AI algorithms predict market movements and how to leverage them.",
      level: "Advanced",
      duration: "4h 00m",
      lessons: 18,
      progress: 0,
      icon: <Brain className="w-6 h-6 text-purple-500" />,
      color: "border-purple-500/20"
    }
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold mb-2">Learning Center</h1>
            <p className="text-muted-foreground">Level up your trading skills with our expert courses</p>
          </div>
          <div className="flex items-center gap-4 bg-secondary/30 p-4 rounded-xl">
             <div className="p-3 bg-primary/20 rounded-full">
                <Award className="w-6 h-6 text-primary" />
             </div>
             <div>
                <p className="text-sm font-medium">Your Rank</p>
                <p className="text-xl font-bold">Novice Trader</p>
             </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`h-full flex flex-col hover:shadow-lg transition-all duration-300 border-t-4 ${course.color}`}>
                <CardHeader>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-secondary rounded-lg">
                      {course.icon}
                    </div>
                    <Badge variant={course.level === 'Beginner' ? 'secondary' : course.level === 'Intermediate' ? 'default' : 'destructive'}>
                      {course.level}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{course.title}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-2">
                    {course.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <PlayCircle className="w-4 h-4" />
                      <span>{course.lessons} Lessons</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{course.duration}</span>
                    </div>
                  </div>
                  
                  {course.progress > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Progress</span>
                        <span>{course.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-500" 
                          style={{ width: `${course.progress}%` }} 
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button className="w-full group">
                    {course.progress > 0 ? 'Continue Learning' : 'Start Course'}
                    <PlayCircle className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Learning;
